import { describe, expect, it } from "vitest";

import { AgentProofError, parseDispositionCommand, parseDispositionInput } from "../src/index.js";
import { HEAD_SHA, validAcceptance } from "./helpers.js";

describe("strict disposition commands", () => {
  it("parses an exact SHA-bound acceptance", () => {
    const parsed = parseDispositionCommand(validAcceptance().body);
    expect(parsed).toMatchObject({
      decision: "accept-exception",
      findingId: "AP-POL-RETENTION-001",
      headSha: HEAD_SHA,
      expires: "2026-09-20",
    });
  });

  it.each([
    "/agentproof accept-exception AP-POL-RETENTION-001",
    `/agentproof accept-exception AP-POL-RETENTION-001\nsha: ${HEAD_SHA}\nreason: ok`,
    ` /agentproof accept-exception AP-POL-RETENTION-001\nsha: ${HEAD_SHA}\nreason: reason\nexpires: 2026-09-20`,
    `/agentproof accept-exception AP-POL-RETENTION-001\nsha: ${HEAD_SHA}\nreason: reason\nexpires: 2026-02-30`,
    `/agentproof reject AP-POL-RETENTION-001\nsha: ${HEAD_SHA}\nreason: reason\nextra: no`,
  ])("rejects malformed command %#", (body) => {
    expect(() => parseDispositionCommand(body)).toThrow(AgentProofError);
  });

  it("rejects duplicate comment identities", () => {
    const comment = validAcceptance();
    expect(() =>
      parseDispositionInput({
        schemaVersion: "1.0.0",
        evaluatedAt: "2026-09-02T08:30:00.000Z",
        comments: [comment, comment],
      }),
    ).toThrow(AgentProofError);
  });

  it("normalizes the bounded GitHub comment collector format", () => {
    const result = parseDispositionInput(
      [
        {
          commentId: 101,
          nodeId: "IC_kw-example",
          body: validAcceptance().body,
          author: "release-manager",
          authorAssociation: "MEMBER",
          permission: "maintain",
          createdAt: "2026-09-02T08:20:00.000Z",
          updatedAt: "2026-09-02T08:21:00.000Z",
          url: "https://github.com/agentproof/example/pull/7#issuecomment-101",
        },
      ],
      "2026-09-02T08:30:00.000Z",
    );
    expect(result.comments[0]).toMatchObject({
      actor: "release-manager",
      actorPermission: "maintain",
      recordedAt: "2026-09-02T08:21:00.000Z",
    });
  });

  it("normalizes an oversized command candidate so evaluation can record it as malformed", () => {
    const body = `/agentproof accept-exception AP-POL-RETENTION-001\n${"x".repeat(5000)}`;
    const result = parseDispositionInput(
      [
        {
          commentId: 102,
          nodeId: "IC_kw-oversized",
          body,
          author: "release-manager",
          authorAssociation: "MEMBER",
          permission: "maintain",
          createdAt: "2026-09-02T08:20:00.000Z",
          updatedAt: "2026-09-02T08:21:00.000Z",
          url: "https://github.com/agentproof/example/pull/7#issuecomment-102",
        },
      ],
      "2026-09-02T08:30:00.000Z",
    );
    expect(result.comments[0]?.body).toBe(body);
    expect(() => parseDispositionCommand(body)).toThrow(AgentProofError);
  });
});
