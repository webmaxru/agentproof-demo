import { ZERO_SHA256 } from "./constants.js";
import { AgentProofError } from "./errors.js";
import { parseEvidenceDocument, type Artifact, type EvidenceDocument } from "./evidence-schema.js";
import { canonicalSha256 } from "./sha256.js";

type ArtifactCarrier = {
  readonly artifact: Artifact;
};

export function computeArtifactDigest(document: ArtifactCarrier): string {
  const unsigned = {
    ...document,
    artifact: {
      ...document.artifact,
      sha256: ZERO_SHA256,
    },
  };
  return canonicalSha256(unsigned);
}

export function withArtifactDigest<T extends ArtifactCarrier>(document: T): T {
  const unsigned = {
    ...document,
    artifact: {
      ...document.artifact,
      sha256: ZERO_SHA256,
    },
  };
  const digest = canonicalSha256(unsigned);
  return {
    ...unsigned,
    artifact: {
      ...unsigned.artifact,
      sha256: digest,
    },
  };
}

export function verifyArtifactDigest(document: EvidenceDocument): void {
  const actual = computeArtifactDigest(document);
  if (actual !== document.artifact.sha256) {
    throw new AgentProofError(
      "AP_ARTIFACT_DIGEST_MISMATCH",
      "Artifact SHA-256 does not match its canonical JSON content.",
      [`expected=${document.artifact.sha256}`, `actual=${actual}`],
    );
  }
}

export function parseAndVerifyEvidence(input: unknown): EvidenceDocument {
  const document = parseEvidenceDocument(input);
  verifyArtifactDigest(document);
  return document;
}
