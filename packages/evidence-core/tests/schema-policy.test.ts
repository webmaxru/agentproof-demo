import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  AgentProofError,
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
});
