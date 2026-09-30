import { describe, expect, it } from "vitest";

import {
  AgentProofError,
  assembleEvidence,
  createReviewFragment,
  verifyArtifactDigest,
} from "../src/index.js";
import { BASE_SHA, HEAD_SHA, OTHER_SHA, evaluateFixture, rawEvidenceFixture } from "./helpers.js";

function fragmentFor(evidence: ReturnType<typeof evaluateFixture>, headSha = HEAD_SHA) {
  return createReviewFragment({
    repository: "agentproof/example",
    pullRequestNumber: 7,
    baseSha: BASE_SHA,
    headSha,
    policySha256: evidence.policy.sha256,
    evidenceArtifactSha256: evidence.artifact.sha256,
    reviewerNote: {
      specialist: "security",
      sessionUrl: "https://github.com/copilot/agents/session/1",
      sourceSha: headSha,
      summary: "Dependency evidence is internally consistent.",
      findingIds: ["AP-SEC-NPM-AUDIT-001"],
      createdAt: "2026-09-02T08:40:00.000Z",
    },
  });
}

describe("evidence assembly", () => {
  it("merges same-SHA reviewer notes and rehashes the artifact", () => {
    const evidence = evaluateFixture(rawEvidenceFixture());
    const fragment = fragmentFor(evidence);
    const assembled = assembleEvidence(evidence, [fragment]);
    expect(assembled.reviewerNotes).toHaveLength(1);
    expect(assembled.artifact.sha256).not.toBe(evidence.artifact.sha256);
    expect(() => verifyArtifactDigest(assembled)).not.toThrow();
  });

  it("rejects mixed head SHAs", () => {
    const evidence = evaluateFixture(rawEvidenceFixture());
    expect(() => assembleEvidence(evidence, [fragmentFor(evidence, OTHER_SHA)])).toThrowError(
      AgentProofError,
    );
  });

  it("rejects a fragment bound to another policy", () => {
    const evidence = evaluateFixture(rawEvidenceFixture());
    const fragment = fragmentFor(evidence);
    const changed = createReviewFragment({
      ...fragment,
      policySha256: "a".repeat(64),
      reviewerNote: fragment.reviewerNote,
    });
    expect(() => assembleEvidence(evidence, [changed])).toThrowError(/policy digest/);
  });

  it("rejects tampered and duplicate fragments", () => {
    const evidence = evaluateFixture(rawEvidenceFixture());
    const fragment = fragmentFor(evidence);
    const tampered = structuredClone(fragment);
    tampered.reviewerNote.summary = "tampered";
    expect(() => assembleEvidence(evidence, [tampered])).toThrowError(/does not match/);
    expect(() => assembleEvidence(evidence, [fragment, fragment])).toThrowError(/Duplicate/);
  });
});
