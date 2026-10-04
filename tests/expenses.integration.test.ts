import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { ApprovedExpense, PendingExpense } from "../src/store.js";

const SYNTHETIC_EXPENSE = {
  submittedBy: "synthetic-employee-001",
  description: "Synthetic conference registration",
  amountCents: 12_500,
  currency: "USD",
} as const;

describe("synthetic expense approval API", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("reports its health", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ status: string }>()).toEqual({ status: "ok" });
  });

  it("creates and reads an expense with deterministic values", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/expenses",
      payload: SYNTHETIC_EXPENSE,
    });

    expect(created.statusCode).toBe(201);
    expect(created.headers.location).toBe("/expenses/expense-0001");
    expect(created.json<PendingExpense>()).toEqual({
      ...SYNTHETIC_EXPENSE,
      id: "expense-0001",
      status: "pending",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const read = await app.inject({ method: "GET", url: "/expenses/expense-0001" });
    expect(read.statusCode).toBe(200);
    expect(read.json<PendingExpense>()).toEqual(created.json<PendingExpense>());
  });

  it("validates new expenses and returns not found for a missing expense", async () => {
    const invalid = await app.inject({
      method: "POST",
      url: "/expenses",
      payload: { ...SYNTHETIC_EXPENSE, amountCents: 0 },
    });
    expect(invalid.statusCode).toBe(400);

    const missing = await app.inject({ method: "GET", url: "/expenses/expense-9999" });
    expect(missing.statusCode).toBe(404);
    expect(missing.json<{ error: string }>()).toMatchObject({ error: "expense_not_found" });
  });

  it("requires a caller identity before approval", async () => {
    await app.inject({ method: "POST", url: "/expenses", payload: SYNTHETIC_EXPENSE });

    const response = await app.inject({
      method: "POST",
      url: "/expenses/expense-0001/approve",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json<{ error: string }>()).toMatchObject({ error: "actor_required" });
  });

  it("[AP-ID:expense-approval.authorization.non-approver-denied] denies approval to a caller outside the approver allow-list", async () => {
    await app.inject({ method: "POST", url: "/expenses", payload: SYNTHETIC_EXPENSE });

    const response = await app.inject({
      method: "POST",
      url: "/expenses/expense-0001/approve",
      headers: { "x-agentproof-actor-id": "synthetic-employee-002" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json<{ error: string }>()).toMatchObject({ error: "approval_forbidden" });
  });

  it("allows an authorized approver and rejects a second approval", async () => {
    await app.inject({ method: "POST", url: "/expenses", payload: SYNTHETIC_EXPENSE });

    const approved = await app.inject({
      method: "POST",
      url: "/expenses/expense-0001/approve",
      headers: { "x-agentproof-actor-id": "synthetic-approver-001" },
    });

    expect(approved.statusCode).toBe(200);
    expect(approved.json<ApprovedExpense>()).toMatchObject({
      id: "expense-0001",
      status: "approved",
      approvedBy: "synthetic-approver-001",
      approvedAt: "2026-01-01T00:00:01.000Z",
    });

    const duplicate = await app.inject({
      method: "POST",
      url: "/expenses/expense-0001/approve",
      headers: { "x-agentproof-actor-id": "synthetic-approver-002" },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json<{ error: string }>()).toMatchObject({ error: "already_approved" });
  });

  it("prevents self-approval and does not reveal missing expenses to unauthorized callers", async () => {
    const selfApprovalApp = buildApp({ approverIds: ["synthetic-employee-001"] });
    await app.close();
    app = selfApprovalApp;

    await app.inject({ method: "POST", url: "/expenses", payload: SYNTHETIC_EXPENSE });

    const selfApproval = await app.inject({
      method: "POST",
      url: "/expenses/expense-0001/approve",
      headers: { "x-agentproof-actor-id": "synthetic-employee-001" },
    });
    expect(selfApproval.statusCode).toBe(403);
    expect(selfApproval.json<{ error: string }>()).toMatchObject({
      error: "self_approval_forbidden",
    });

    const unauthorizedMissing = await app.inject({
      method: "POST",
      url: "/expenses/expense-9999/approve",
      headers: { "x-agentproof-actor-id": "synthetic-employee-999" },
    });
    expect(unauthorizedMissing.statusCode).toBe(403);

    const authorizedMissing = await app.inject({
      method: "POST",
      url: "/expenses/expense-9999/approve",
      headers: { "x-agentproof-actor-id": "synthetic-employee-001" },
    });
    expect(authorizedMissing.statusCode).toBe(404);
  });
});
