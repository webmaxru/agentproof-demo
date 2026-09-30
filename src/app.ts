import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";

import {
  DeterministicExpenseStore,
  type ApprovalResult,
  type CreateExpenseInput,
} from "./store.js";

export const SYNTHETIC_APPROVER_IDS = ["synthetic-approver-001", "synthetic-approver-002"] as const;

export interface BuildAppOptions {
  readonly store?: DeterministicExpenseStore;
  readonly approverIds?: readonly string[];
}

interface ExpenseParams {
  readonly expenseId: string;
}

interface ErrorResponse {
  readonly error: string;
  readonly message: string;
}

type RejectedApprovalResult = Exclude<ApprovalResult, { readonly outcome: "approved" }>;

const createExpenseSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["submittedBy", "description", "amountCents", "currency"],
    properties: {
      submittedBy: { type: "string", minLength: 1, maxLength: 80 },
      description: { type: "string", minLength: 1, maxLength: 200 },
      amountCents: { type: "integer", minimum: 1, maximum: 10_000_000 },
      currency: { type: "string", pattern: "^[A-Z]{3}$" },
    },
  },
} as const;

const expenseParamsSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["expenseId"],
    properties: {
      expenseId: { type: "string", pattern: "^expense-[0-9]{4,}$" },
    },
  },
} as const;

function actorIdFrom(request: FastifyRequest): string | undefined {
  const actorId = request.headers["x-agentproof-actor-id"];

  if (typeof actorId !== "string" || actorId.trim().length === 0) {
    return undefined;
  }

  return actorId.trim();
}

function approvalError(reply: FastifyReply, result: RejectedApprovalResult): ErrorResponse {
  switch (result.outcome) {
    case "not-found":
      reply.code(404);
      return { error: "expense_not_found", message: "The expense does not exist." };
    case "self-approval-forbidden":
      reply.code(403);
      return {
        error: "self_approval_forbidden",
        message: "An approver cannot approve their own expense.",
      };
    case "already-approved":
      reply.code(409);
      return { error: "already_approved", message: "The expense is already approved." };
  }
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const store = options.store ?? new DeterministicExpenseStore();
  const approverIds = new Set(options.approverIds ?? SYNTHETIC_APPROVER_IDS);

  app.get("/health", () => ({ status: "ok" }));

  app.post<{ Body: CreateExpenseInput }>(
    "/expenses",
    { schema: createExpenseSchema },
    (request, reply) => {
      const expense = store.create(request.body);
      reply.code(201).header("location", `/expenses/${expense.id}`);
      return expense;
    },
  );

  app.get<{ Params: ExpenseParams }>(
    "/expenses/:expenseId",
    { schema: expenseParamsSchema },
    (request, reply) => {
      const expense = store.get(request.params.expenseId);

      if (expense === undefined) {
        reply.code(404);
        return { error: "expense_not_found", message: "The expense does not exist." };
      }

      return expense;
    },
  );

  app.post<{ Params: ExpenseParams }>(
    "/expenses/:expenseId/approve",
    { schema: expenseParamsSchema },
    (request, reply) => {
      const actorId = actorIdFrom(request);

      if (actorId === undefined) {
        reply.code(401);
        return {
          error: "actor_required",
          message: "The trusted caller identity header is required.",
        };
      }

      if (!approverIds.has(actorId)) {
        reply.code(403);
        return {
          error: "approval_forbidden",
          message: "The caller is not authorized to approve expenses.",
        };
      }

      const result = store.approve(request.params.expenseId, actorId);

      if (result.outcome !== "approved") {
        return approvalError(reply, result);
      }

      reply.code(200);
      return result.expense;
    },
  );

  return app;
}
