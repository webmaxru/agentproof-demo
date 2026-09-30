import { readFileSync } from "node:fs";

import {
  EVIDENCE_SCHEMA_VERSION,
  FINDING_IDS,
  ZERO_SHA256,
  evaluateEvidence,
  loadReleasePolicyYaml,
  rawEvidenceSchema,
  withArtifactDigest,
  type DispositionInput,
  type Finding,
  type RawEvidence,
  type ReleasePolicy,
} from "../src/index.js";

export const BASE_SHA = "1".repeat(40);
export const HEAD_SHA = "2".repeat(40);
export const OTHER_SHA = "3".repeat(40);
export const EVALUATED_AT = "2026-09-02T08:30:00.000Z";

export function policyFixture(): ReleasePolicy {
  const source = readFileSync(
    new URL("../../../policy/release-policy.yml", import.meta.url),
    "utf8",
  );
  return loadReleasePolicyYaml(source);
}

function finding(
  fields: Pick<Finding, "id" | "category" | "severity" | "title" | "collector" | "facts">,
): Finding {
  return {
    ...fields,
    state: "pass",
    summary: "Positive collector evidence is present.",
    evidenceRefs: [],
    exceptionable: fields.id === FINDING_IDS.dataRetention,
    remediationHint: "Remediate this finding and rerun evidence.",
    sourceSha: HEAD_SHA,
  };
}

export function rawEvidenceFixture(): RawEvidence {
  const raw: RawEvidence = {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    documentType: "raw",
    repository: "agentproof/example",
    pullRequestNumber: 7,
    baseSha: BASE_SHA,
    headSha: HEAD_SHA,
    generatedAt: "2026-09-02T08:00:00.000Z",
    generatorVersion: "0.1.0",
    origin: {
      classification: "self-declared",
      declaredTool: "Claude Code",
      source: "pull-request-body",
    },
    tools: {
      nodeVersion: "v22.18.0",
      npmVersion: "11.5.0",
      vitestVersion: "3.2.4",
      auditDatabaseUpdatedAt: null,
      agentproofVersion: "0.1.0",
    },
    findings: [
      finding({
        id: FINDING_IDS.testSuite,
        category: "test",
        severity: "high",
        title: "Tests",
        collector: "vitest",
        facts: {
          total: 3,
          passed: 3,
          failed: 0,
          skipped: 0,
          testCases: [
            {
              id: "expense-approval.authorization.non-approver-denied",
              name: "[AP-ID:expense-approval.authorization.non-approver-denied]",
              status: "passed",
            },
          ],
        },
      }),
      finding({
        id: FINDING_IDS.testCoverage,
        category: "test",
        severity: "moderate",
        title: "Coverage",
        collector: "vitest",
        facts: {
          linesPct: 90,
          functionsPct: 90,
          branchesPct: 90,
          statementsPct: 90,
        },
      }),
      finding({
        id: FINDING_IDS.npmAudit,
        category: "security",
        severity: "high",
        title: "Audit",
        collector: "npm-audit",
        facts: {
          total: 0,
          highestSeverity: "none",
          severityCounts: {
            info: 0,
            low: 0,
            moderate: 0,
            high: 0,
            critical: 0,
          },
          advisoryIds: [],
        },
      }),
      finding({
        id: FINDING_IDS.dataRetention,
        category: "policy",
        severity: "moderate",
        title: "Retention",
        collector: "data-retention",
        facts: {
          declaration: {
            schemaVersion: "1.0.0",
            classification: "synthetic",
            retentionDays: 30,
            deletionMethod: "automatic-expiry",
            owner: "expense-api",
          },
          missingFields: [],
        },
      }),
      finding({
        id: FINDING_IDS.origin,
        category: "provenance",
        severity: "low",
        title: "Origin",
        collector: "origin",
        facts: {
          classification: "self-declared",
          declaredTool: "Claude Code",
        },
      }),
    ],
    diagnostics: [],
    reviewerNotes: [],
    artifact: {
      sha256: ZERO_SHA256,
      workflowRunUrl: "https://github.com/agentproof/example/actions/runs/1",
    },
  };
  return rawEvidenceSchema.parse(withArtifactDigest(raw));
}

export function dispositionInput(comments: DispositionInput["comments"] = []): DispositionInput {
  return {
    schemaVersion: "1.0.0",
    evaluatedAt: EVALUATED_AT,
    comments,
  };
}

export function validAcceptance(
  overrides: Partial<DispositionInput["comments"][number]> = {},
): DispositionInput["comments"][number] {
  return {
    commentId: "101",
    commentUrl: "https://github.com/agentproof/example/pull/7#issuecomment-101",
    actor: "release-manager",
    actorPermission: "maintain",
    body: `/agentproof accept-exception ${FINDING_IDS.dataRetention}
sha: ${HEAD_SHA}
reason: Synthetic demo data is bounded while its declaration is corrected.
expires: 2026-09-20`,
    recordedAt: "2026-09-02T08:20:00.000Z",
    sourceState: "active",
    ...overrides,
  };
}

export function evaluateFixture(raw: RawEvidence, comments: DispositionInput["comments"] = []) {
  return evaluateEvidence({
    rawEvidence: raw,
    policy: policyFixture(),
    dispositions: dispositionInput(comments),
  });
}

export function resign(input: RawEvidence, mutate: (draft: RawEvidence) => void): RawEvidence {
  const draft = structuredClone(input);
  mutate(draft);
  draft.artifact.sha256 = ZERO_SHA256;
  return rawEvidenceSchema.parse(withArtifactDigest(draft));
}
