import { readFileSync } from "node:fs";

import { assert, describe, expect, it } from "vitest";

import {
  AgentProofError,
  FINDING_IDS,
  ZERO_SHA256,
  loadReleasePolicyYaml,
  parseAndVerifyEvidence,
  parseRawEvidence,
  parseReleasePolicy,
  verifyArtifactDigest,
} from "../src/index.js";
import { policyFixture, rawEvidenceFixture } from "./helpers.js";

describe("versioned contracts", () => {
  it("loads the protected release policy", () => {
    const policy = policyFixture();
    expect(policy.schemaVersion).toBe("1.0.0");
    expect(policy.rules.dependencies.maximumAllowedSeverity).toBe("moderate");
  });

  it("rejects unknown evidence and policy versions", () => {
    const raw = structuredClone(rawEvidenceFixture()) as unknown as Record<string, unknown>;
    raw.schemaVersion = "0.9.0";
    expect(() => parseRawEvidence(raw)).toThrow(AgentProofError);

    const policy = structuredClone(policyFixture()) as unknown as Record<string, unknown>;
    policy.schemaVersion = "2.0.0";
    expect(() => parseReleasePolicy(policy)).toThrow(AgentProofError);
  });

  it("rejects malformed and duplicate-key policy YAML", () => {
    expect(() => loadReleasePolicyYaml("schemaVersion: 1.0.0\nschemaVersion: 1.0.0\n")).toThrow(
      AgentProofError,
    );
  });

  it("ships parseable JSON schemas", () => {
    expect(() => {
      JSON.parse(
        readFileSync(new URL("../schemas/evidence-v1.schema.json", import.meta.url), "utf8"),
      );
    }).not.toThrow();
    expect(() => {
      JSON.parse(
        readFileSync(
          new URL("../../../policy/release-policy.schema.json", import.meta.url),
          "utf8",
        ),
      );
    }).not.toThrow();
  });

  it("detects tampering after artifact creation", () => {
    expect(parseAndVerifyEvidence(rawEvidenceFixture()).documentType).toBe("raw");
    const raw = structuredClone(rawEvidenceFixture());
    raw.findings[0]!.summary = "tampered";
    expect(() => verifyArtifactDigest(raw)).toThrowError(/does not match its canonical JSON/);
  });

  it("ships a verified, explicitly synthetic fallback with blocking findings", () => {
    const evidence = parseAndVerifyEvidence(
      JSON.parse(
        readFileSync(new URL("../../../demo/synthetic-findings.json", import.meta.url), "utf8"),
      ),
    );
    const baseSha = "0".repeat(40);
    const headSha = "1".repeat(40);

    assert(evidence.documentType === "final", "Synthetic fallback must contain final evidence.");
    expect(evidence).toMatchObject({
      repository: "agentproof/synthetic-demo",
      pullRequestNumber: 1,
      baseSha,
      headSha,
      generatedAt: "2026-09-02T08:29:23.038Z",
      generatorVersion: "0.1.0-precomputed-not-live-synthetic",
      origin: {
        classification: "self-declared",
        declaredTool: "synthetic-fixture-not-live",
        source: "pull-request-body",
      },
      policy: { baseSha, sha256: ZERO_SHA256 },
      tools: { auditDatabaseUpdatedAt: null },
      dispositions: [],
      reviewerNotes: [],
      gate: {
        conclusion: "failure",
        unresolvedFindingIds: [
          FINDING_IDS.authorizationTest,
          FINDING_IDS.npmAudit,
          FINDING_IDS.dataRetention,
        ],
        counts: { pass: 0, fail: 2, unknown: 1, exception: 0 },
        evaluatedAt: "2026-09-02T08:29:23.038Z",
        validUntil: null,
      },
      artifact: { workflowRunUrl: null },
    });
    expect(
      evidence.findings.map(({ id, state, exceptionable, sourceSha }) => ({
        id,
        state,
        exceptionable,
        sourceSha,
      })),
    ).toEqual([
      {
        id: FINDING_IDS.authorizationTest,
        state: "fail",
        exceptionable: false,
        sourceSha: headSha,
      },
      {
        id: FINDING_IDS.npmAudit,
        state: "fail",
        exceptionable: false,
        sourceSha: headSha,
      },
      {
        id: FINDING_IDS.dataRetention,
        state: "unknown",
        exceptionable: true,
        sourceSha: headSha,
      },
    ]);
    expect(
      evidence.findings.flatMap((finding) =>
        finding.evidenceRefs.filter((reference) =>
          ["workflow", "pull-request"].includes(reference.kind),
        ),
      ),
    ).toEqual([]);
  });
});
