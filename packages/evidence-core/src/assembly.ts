import { EVIDENCE_SCHEMA_VERSION, ZERO_SHA256 } from "./constants.js";
import { AgentProofError } from "./errors.js";
import {
  finalEvidenceSchema,
  parseFinalEvidence,
  parseReviewFragment,
  type FinalEvidence,
  type ReviewFragment,
  type ReviewerNote,
} from "./evidence-schema.js";
import { verifyArtifactDigest, withArtifactDigest } from "./artifact.js";

function assertSameIdentity(evidence: FinalEvidence, fragment: ReviewFragment): void {
  const mismatches: string[] = [];
  if (fragment.repository !== evidence.repository) {
    mismatches.push("repository");
  }
  if (fragment.pullRequestNumber !== evidence.pullRequestNumber) {
    mismatches.push("pullRequestNumber");
  }
  if (fragment.baseSha !== evidence.baseSha) {
    mismatches.push("baseSha");
  }
  if (fragment.headSha !== evidence.headSha) {
    mismatches.push("headSha");
  }
  if (mismatches.length > 0) {
    throw new AgentProofError(
      "AP_ASSEMBLY_MIXED_IDENTITY",
      "Review fragments must describe exactly one evidence identity.",
      mismatches,
    );
  }
}

function noteFromFragment(fragment: ReviewFragment): ReviewerNote {
  return {
    ...fragment.reviewerNote,
    fragmentSha256: fragment.artifact.sha256,
  };
}

export function assembleEvidence(
  evidenceInput: unknown,
  fragmentInputs: readonly unknown[],
): FinalEvidence {
  const evidence = parseFinalEvidence(evidenceInput);
  verifyArtifactDigest(evidence);

  const fragments = fragmentInputs.map((input) => parseReviewFragment(input));
  const findingIds = new Set(evidence.findings.map((finding) => finding.id));
  for (const fragment of fragments) {
    verifyArtifactDigest(fragment);
    assertSameIdentity(evidence, fragment);
    if (fragment.evidenceArtifactSha256 !== evidence.artifact.sha256) {
      throw new AgentProofError(
        "AP_ASSEMBLY_EVIDENCE_DIGEST_MISMATCH",
        "Review fragment is not bound to the input evidence artifact.",
      );
    }
    if (fragment.policySha256 !== evidence.policy.sha256) {
      throw new AgentProofError(
        "AP_ASSEMBLY_POLICY_MISMATCH",
        "Review fragment policy digest does not match final evidence.",
      );
    }
    const unknownFindingIds = fragment.reviewerNote.findingIds.filter((id) => !findingIds.has(id));
    if (unknownFindingIds.length > 0) {
      throw new AgentProofError(
        "AP_ASSEMBLY_UNKNOWN_FINDING",
        "Review fragment references findings absent from final evidence.",
        unknownFindingIds,
      );
    }
  }

  const fragmentDigests = new Set<string>();
  const notes: ReviewerNote[] = [...evidence.reviewerNotes];
  for (const fragment of fragments) {
    if (fragmentDigests.has(fragment.artifact.sha256)) {
      throw new AgentProofError(
        "AP_ASSEMBLY_DUPLICATE_FRAGMENT",
        "Duplicate review fragment supplied to the assembler.",
      );
    }
    fragmentDigests.add(fragment.artifact.sha256);
    if (notes.some((note) => note.fragmentSha256 === fragment.artifact.sha256)) {
      throw new AgentProofError(
        "AP_ASSEMBLY_DUPLICATE_FRAGMENT",
        "Review fragment is already present in the evidence document.",
      );
    }
    notes.push(noteFromFragment(fragment));
  }
  notes.sort((left, right) => {
    const time = left.createdAt < right.createdAt ? -1 : left.createdAt > right.createdAt ? 1 : 0;
    return time !== 0
      ? time
      : left.fragmentSha256 < right.fragmentSha256
        ? -1
        : left.fragmentSha256 > right.fragmentSha256
          ? 1
          : 0;
  });

  const unsigned = {
    ...evidence,
    reviewerNotes: notes,
    artifact: {
      ...evidence.artifact,
      sha256: ZERO_SHA256,
    },
  };
  const normalized = finalEvidenceSchema.parse(unsigned);
  const assembled = withArtifactDigest(normalized);
  return finalEvidenceSchema.parse(assembled);
}

export function createReviewFragment(
  input: Omit<ReviewFragment, "schemaVersion" | "documentType" | "artifact"> & {
    readonly workflowRunUrl?: string | null;
  },
): ReviewFragment {
  const { workflowRunUrl = null, ...fields } = input;
  const normalized = parseReviewFragment({
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    documentType: "review-fragment",
    ...fields,
    artifact: {
      sha256: ZERO_SHA256,
      workflowRunUrl,
    },
  });
  return parseReviewFragment(withArtifactDigest(normalized));
}
