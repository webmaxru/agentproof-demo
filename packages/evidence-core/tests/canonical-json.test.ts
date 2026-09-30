import { describe, expect, it } from "vitest";

import { AgentProofError, canonicalJson, canonicalSha256, sha256 } from "../src/index.js";

describe("canonical JSON", () => {
  it("sorts object keys recursively without changing array order", () => {
    expect(canonicalJson({ z: 1, a: { y: 2, x: [3, 2, 1] } })).toBe(
      '{"a":{"x":[3,2,1],"y":2},"z":1}',
    );
  });

  it("produces stable SHA-256 digests", () => {
    expect(canonicalSha256({ b: 2, a: 1 })).toBe(
      "43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777",
    );
    expect(sha256("agentproof")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects undefined, non-finite, and cyclic values", () => {
    expect(() => canonicalJson({ value: undefined })).toThrow(AgentProofError);
    expect(() => canonicalJson(Number.NaN)).toThrow(AgentProofError);
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => canonicalJson(cyclic)).toThrow(AgentProofError);
    expect(() => canonicalJson(new Array(2))).toThrow(AgentProofError);
    const symbolObject: Record<string, unknown> = {};
    Object.defineProperty(symbolObject, Symbol("hidden"), { value: true });
    expect(() => canonicalJson(symbolObject)).toThrow(AgentProofError);
  });
});
