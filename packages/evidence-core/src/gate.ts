import { AGENTPROOF_VERSION, FINDING_IDS, SEVERITIES, ZERO_SHA256 } from "./constants.js";
import {
  calendarDayDistance,
  expiryEnd,
  hasMinimumPermission,
  parseDispositionCommand,
  parseDispositionInput,
  type DispositionInput,
} from "./disposition.js";
import { AgentProofError } from "./errors.js";
import {
  finalEvidenceSchema,
  parseRawEvidence,
  type Diagnostic,
  type DispositionRecord,
  type FinalEvidence,
  type Finding,
  type JsonValue,
  type RawEvidence,
} from "./evidence-schema.js";
import { withArtifactDigest, verifyArtifactDigest } from "./artifact.js";
import { parseReleasePolicy, type FindingPolicy, type ReleasePolicy } from "./policy.js";
import { canonicalSha256, sha256 } from "./sha256.js";

export interface EvaluateEvidenceInput {
  readonly rawEvidence: unknown;
  readonly policy: unknown;
  readonly dispositions: unknown;
  readonly workflowRunUrl?: string | null;
}

interface DispositionResult {
  readonly findings: Finding[];
  readonly records: DispositionRecord[];
  readonly forcedBlockers: Set<string>;
  readonly validUntil: string | null;
}

function truncate(value: string, maximum: number): string {
  return value.length <= maximum ? value : `${value.slice(0, Math.max(0, maximum - 1))}…`;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function jsonObject(value: JsonValue | undefined): Record<string, JsonValue> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function finiteNumber(value: JsonValue | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: JsonValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function makeUnknownFinding(
  policy: FindingPolicy,
  category: Finding["category"],
  collector: string,
  sourceSha: string,
  summary: string,
): Finding {
  return {
    id: policy.findingId,
    category,
    state: "unknown",
    severity: policy.severity,
    title: policy.title,
    summary,
    evidenceRefs: [],
    exceptionable: policy.exceptionable,
    remediationHint: policy.remediationHint,
    collector,
    sourceSha,
    facts: {},
  };
}

function configureFinding(
  raw: Finding,
  policy: FindingPolicy,
  category: Finding["category"],
  collector: string,
): Finding {
  return {
    ...raw,
    id: policy.findingId,
    category,
    title: policy.title,
    severity: policy.severity,
    exceptionable: policy.exceptionable,
    remediationHint: policy.remediationHint,
    collector,
  };
}

function findRaw(
  rawById: ReadonlyMap<string, Finding>,
  policy: FindingPolicy,
  category: Finding["category"],
  collector: string,
  sourceSha: string,
): Finding {
  const raw = rawById.get(policy.findingId);
  return raw === undefined
    ? makeUnknownFinding(
        policy,
        category,
        collector,
        sourceSha,
        "Required collector evidence is absent.",
      )
    : configureFinding(raw, policy, category, collector);
}

function evaluateTestSuite(raw: Finding): Finding {
  if (raw.state === "unknown") {
    return raw;
  }
  const total = finiteNumber(raw.facts.total);
  const passed = finiteNumber(raw.facts.passed);
  const failed = finiteNumber(raw.facts.failed);
  const skipped = finiteNumber(raw.facts.skipped);
  const counts = [total, passed, failed, skipped];
  if (
    counts.some((value) => value === null || !Number.isInteger(value) || value < 0) ||
    total === null ||
    passed === null ||
    failed === null ||
    skipped === null ||
    total !== passed + failed + skipped
  ) {
    return {
      ...raw,
      state: "unknown",
      summary: "Vitest suite evidence contains inconsistent result counts.",
    };
  }
  if (total === 0) {
    return {
      ...raw,
      state: "fail",
      summary: "Vitest completed without executing any tests.",
    };
  }
  return {
    ...raw,
    state: failed > 0 ? "fail" : "pass",
    summary:
      failed > 0
        ? `${failed} of ${total} Vitest tests failed.`
        : `All ${total} Vitest tests passed.`,
  };
}

function evaluateCoverage(
  raw: Finding,
  policy: ReleasePolicy["rules"]["tests"]["coverage"],
): Finding {
  if (raw.state !== "pass") {
    return raw;
  }

  const minimum = policy.minimum;
  const actual = {
    lines: finiteNumber(raw.facts.linesPct),
    functions: finiteNumber(raw.facts.functionsPct),
    branches: finiteNumber(raw.facts.branchesPct),
    statements: finiteNumber(raw.facts.statementsPct),
  };
  if (Object.values(actual).some((value) => value === null || value < 0 || value > 100)) {
    return {
      ...raw,
      state: "unknown",
      summary: "Coverage report lacks one or more required percentages.",
    };
  }

  const below = (Object.keys(minimum) as Array<keyof typeof minimum>).filter(
    (metric) => (actual[metric] ?? -1) < minimum[metric],
  );
  if (below.length > 0) {
    return {
      ...raw,
      state: "fail",
      summary: `Coverage is below policy for: ${below.join(", ")}.`,
    };
  }
  return {
    ...raw,
    state: "pass",
    summary: "Coverage meets every protected policy threshold.",
  };
}

function testCasesFrom(finding: Finding): Array<{
  id: string;
  name: string;
  status: string;
}> | null {
  const value = finding.facts.testCases;
  if (!Array.isArray(value)) {
    return null;
  }
  const result: Array<{ id: string; name: string; status: string }> = [];
  for (const item of value) {
    const record = jsonObject(item);
    const id = record === null ? null : stringValue(record.id);
    const name = record === null ? null : stringValue(record.name);
    const status = record === null ? null : stringValue(record.status);
    if (id === null || name === null || status === null) {
      return null;
    }
    result.push({ id, name, status });
  }
  return result;
}

function evaluateRequiredTest(
  suite: Finding,
  policy: ReleasePolicy["rules"]["tests"]["requiredTests"][number],
  sourceSha: string,
): Finding {
  const base = makeUnknownFinding(
    policy,
    "test",
    "vitest",
    sourceSha,
    "Required test evidence could not be established.",
  );
  base.evidenceRefs = suite.evidenceRefs;

  if (suite.state === "unknown") {
    return base;
  }

  const testCases = testCasesFrom(suite);
  if (testCases === null) {
    return {
      ...base,
      summary: "Vitest evidence does not contain valid stable test IDs.",
    };
  }
  const matches = testCases.filter((test) => test.id === policy.testId);
  if (matches.length !== 1) {
    return {
      ...base,
      state: "fail",
      summary:
        matches.length === 0
          ? `Required test ID "${policy.testId}" is absent.`
          : `Required test ID "${policy.testId}" is duplicated.`,
      facts: { requiredTestId: policy.testId, matchCount: matches.length },
    };
  }

  const match = matches[0];
  if (match === undefined) {
    throw new AgentProofError(
      "AP_INTERNAL_ERROR",
      "Required test matching produced an impossible result.",
    );
  }
  const passed = match.status === "passed";
  return {
    ...base,
    state: passed ? "pass" : "fail",
    summary: passed
      ? `Required test "${policy.testId}" passed.`
      : `Required test "${policy.testId}" did not pass (${match.status}).`,
    facts: {
      requiredTestId: policy.testId,
      testName: match.name,
      status: match.status,
    },
  };
}

function severityRank(value: string): number {
  return SEVERITIES.indexOf(value as (typeof SEVERITIES)[number]);
}

function evaluateDependencies(
  raw: Finding,
  policy: ReleasePolicy["rules"]["dependencies"],
): Finding {
  if (raw.state === "unknown") {
    return raw;
  }
  const highest = stringValue(raw.facts.highestSeverity);
  const total = finiteNumber(raw.facts.total);
  const severityCounts = jsonObject(raw.facts.severityCounts);
  const normalizedCounts =
    severityCounts === null
      ? null
      : SEVERITIES.map((severity) => finiteNumber(severityCounts[severity]));
  if (
    highest === null ||
    total === null ||
    !Number.isInteger(total) ||
    total < 0 ||
    normalizedCounts === null ||
    normalizedCounts.some((count) => count === null || !Number.isInteger(count) || count < 0)
  ) {
    return {
      ...raw,
      state: "unknown",
      summary: "Dependency evidence contains inconsistent counts or severity.",
    };
  }
  const counts = normalizedCounts as number[];
  const calculatedTotal = counts.reduce((sum, count) => sum + count, 0);
  let calculatedHighestIndex = -1;
  for (let index = counts.length - 1; index >= 0; index -= 1) {
    if ((counts[index] ?? 0) > 0) {
      calculatedHighestIndex = index;
      break;
    }
  }
  const calculatedHighest =
    calculatedHighestIndex < 0 ? "none" : SEVERITIES[calculatedHighestIndex];
  if (
    calculatedTotal !== total ||
    calculatedHighest === undefined ||
    calculatedHighest !== highest
  ) {
    return {
      ...raw,
      state: "unknown",
      summary: "Dependency severity facts do not agree with their totals.",
    };
  }
  if (highest === "none") {
    return {
      ...raw,
      state: "pass",
      summary: "npm audit reported no production dependency vulnerabilities.",
    };
  }
  const actualRank = severityRank(highest);
  if (actualRank < 0) {
    return {
      ...raw,
      state: "unknown",
      summary: "Dependency evidence contains an unrecognized severity.",
    };
  }
  const failed = actualRank > severityRank(policy.maximumAllowedSeverity);
  return {
    ...raw,
    state: failed ? "fail" : "pass",
    summary: failed
      ? `Highest dependency severity ${highest} exceeds allowed ${policy.maximumAllowedSeverity}.`
      : `Highest dependency severity ${highest} is within policy.`,
  };
}

function evaluateRetention(raw: Finding, policy: ReleasePolicy["rules"]["dataRetention"]): Finding {
  const declaration = jsonObject(raw.facts.declaration);
  if (declaration === null) {
    return {
      ...raw,
      state: "unknown",
      summary: "Data-retention declaration is absent or malformed.",
    };
  }
  const missing = policy.requiredFields.filter((field) => {
    const value = declaration[field];
    return (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim().length === 0) ||
      (Array.isArray(value) && value.length === 0)
    );
  });
  if (missing.length > 0) {
    return {
      ...raw,
      state: "unknown",
      summary: `Data-retention declaration is missing: ${missing.join(", ")}.`,
      facts: { ...raw.facts, missingFields: missing },
    };
  }
  if (raw.state === "unknown") {
    return {
      ...raw,
      state: "unknown",
      summary: "Data-retention collector did not produce trustworthy evidence.",
    };
  }
  const invalidTextField = ["classification", "deletionMethod", "owner"]
    .filter((field) => policy.requiredFields.includes(field))
    .some((field) => {
      const value = declaration[field];
      return typeof value !== "string" || value.trim().length === 0;
    });
  if (invalidTextField) {
    return {
      ...raw,
      state: "unknown",
      summary: "Data-retention declaration has invalid baseline field types.",
    };
  }
  const retentionDays = finiteNumber(declaration.retentionDays);
  if (retentionDays === null || !Number.isInteger(retentionDays) || retentionDays <= 0) {
    return {
      ...raw,
      state: "unknown",
      summary: "Data-retention declaration has an invalid retentionDays value.",
    };
  }
  const failed = retentionDays > policy.maximumDays;
  return {
    ...raw,
    state: failed ? "fail" : "pass",
    summary: failed
      ? `Declared retention of ${retentionDays} days exceeds ${policy.maximumDays} days.`
      : `Data-retention declaration is complete and within ${policy.maximumDays} days.`,
  };
}

function materializeFindings(raw: RawEvidence, policy: ReleasePolicy): Finding[] {
  const rawById = new Map(raw.findings.map((finding) => [finding.id, finding]));
  const consumed = new Set<string>();

  const suitePolicy = policy.rules.tests.suite;
  const suite = evaluateTestSuite(findRaw(rawById, suitePolicy, "test", "vitest", raw.headSha));
  consumed.add(suitePolicy.findingId);

  const coveragePolicy = policy.rules.tests.coverage;
  const coverageRaw = findRaw(rawById, coveragePolicy, "test", "vitest", raw.headSha);
  consumed.add(coveragePolicy.findingId);

  const dependencyPolicy = policy.rules.dependencies;
  const dependencyRaw = findRaw(rawById, dependencyPolicy, "security", "npm-audit", raw.headSha);
  consumed.add(dependencyPolicy.findingId);

  const retentionPolicy = policy.rules.dataRetention;
  const retentionRaw = findRaw(rawById, retentionPolicy, "policy", "data-retention", raw.headSha);
  consumed.add(retentionPolicy.findingId);

  const provenancePolicy = policy.rules.provenance;
  const provenanceRaw = findRaw(rawById, provenancePolicy, "provenance", "origin", raw.headSha);
  consumed.add(provenancePolicy.findingId);

  for (const rule of policy.rules.tests.requiredTests) {
    consumed.add(rule.findingId);
  }

  const provenance = !provenancePolicy.requireDeclaration
    ? {
        ...provenanceRaw,
        state: "pass" as const,
        summary:
          raw.origin.classification === "unknown"
            ? "Origin declaration is not required by policy."
            : `Origin is classified as ${raw.origin.classification}.`,
      }
    : raw.origin.classification === "unknown" || provenanceRaw.state !== "pass"
      ? {
          ...provenanceRaw,
          state: "unknown" as const,
          summary: "Required AI-assistance origin evidence is unavailable or untrustworthy.",
        }
      : {
          ...provenanceRaw,
          state: "pass" as const,
          summary: `Origin is classified as ${raw.origin.classification}.`,
        };

  const findings: Finding[] = [
    suite,
    evaluateCoverage(coverageRaw, coveragePolicy),
    ...policy.rules.tests.requiredTests.map((rule) =>
      evaluateRequiredTest(suite, rule, raw.headSha),
    ),
    evaluateDependencies(dependencyRaw, dependencyPolicy),
    evaluateRetention(retentionRaw, retentionPolicy),
    provenance,
  ];

  for (const finding of raw.findings) {
    if (!consumed.has(finding.id)) {
      findings.push({
        ...finding,
        exceptionable: false,
        remediationHint: "Resolve the unexpected collector finding; it cannot be excepted.",
      });
    }
  }
  const uncoveredErrorCollectors = [
    ...new Set(
      raw.diagnostics
        .filter(
          (diagnostic) =>
            diagnostic.level === "error" &&
            !raw.findings.some(
              (finding) => finding.collector === diagnostic.collector && finding.state !== "pass",
            ),
        )
        .map((diagnostic) => diagnostic.collector),
    ),
  ].sort();
  if (uncoveredErrorCollectors.length > 0) {
    const integrityFinding: Finding = {
      id: FINDING_IDS.collectorIntegrity,
      category: "policy",
      state: "unknown",
      severity: "high",
      title: "Collector diagnostics are fail-closed",
      summary: "One or more collector errors lack corresponding blocking evidence.",
      evidenceRefs: [],
      exceptionable: false,
      remediationHint: "Repair the collector and regenerate raw evidence.",
      collector: "evaluator",
      sourceSha: raw.headSha,
      facts: { errorCollectors: uncoveredErrorCollectors },
    };
    const existingIndex = findings.findIndex((finding) => finding.id === integrityFinding.id);
    if (existingIndex < 0) {
      findings.push(integrityFinding);
    } else {
      findings[existingIndex] = integrityFinding;
    }
  }
  return findings.sort((left, right) => compareStrings(left.id, right.id));
}

function safeCommandError(error: unknown): string {
  return truncate(error instanceof Error ? error.message : "Disposition command is invalid.", 300);
}

function applyDispositions(
  findingsInput: readonly Finding[],
  input: DispositionInput,
  policy: ReleasePolicy,
  headSha: string,
): DispositionResult {
  const findings = findingsInput.map((finding) => ({ ...finding }));
  const findingById = new Map(findings.map((finding) => [finding.id, finding]));
  const records: DispositionRecord[] = [];
  const currentRecordByFinding = new Map<string, number>();

  const comments = [...input.comments].sort((left, right) => {
    const timeComparison = compareStrings(left.recordedAt, right.recordedAt);
    return timeComparison !== 0
      ? timeComparison
      : BigInt(left.commentId) < BigInt(right.commentId)
        ? -1
        : BigInt(left.commentId) > BigInt(right.commentId)
          ? 1
          : 0;
  });

  for (const comment of comments) {
    const record: DispositionRecord = {
      findingId: null,
      decision: "invalid",
      actor: comment.actor,
      actorPermission: comment.actorPermission,
      commentId: comment.commentId,
      commentUrl: comment.commentUrl,
      bodySha256: sha256(comment.body),
      rationale: null,
      expires: null,
      recordedAt: comment.recordedAt,
      boundHeadSha: null,
      status: "malformed",
      effective: false,
      errors: [],
    };

    if (comment.sourceState !== "active") {
      record.status = comment.sourceState;
      record.errors.push(
        comment.sourceState === "deleted"
          ? "Comment is deleted."
          : "Disposition command was edited away.",
      );
      records.push(record);
      continue;
    }

    let parsed: ReturnType<typeof parseDispositionCommand>;
    try {
      parsed = parseDispositionCommand(comment.body);
    } catch (error) {
      record.errors.push(safeCommandError(error));
      records.push(record);
      continue;
    }

    record.findingId = parsed.findingId;
    record.decision = parsed.decision;
    record.rationale = parsed.rationale;
    record.expires = parsed.expires;
    record.boundHeadSha = parsed.headSha;

    if (parsed.headSha !== headSha) {
      record.status = "stale";
      record.errors.push("Disposition SHA does not match the evidence head SHA.");
      records.push(record);
      continue;
    }

    if (
      !hasMinimumPermission(comment.actorPermission, policy.exceptions.authorizedMinimumPermission)
    ) {
      record.status = "unauthorized";
      record.errors.push("Actor does not have the required repository permission.");
      records.push(record);
      continue;
    }

    const finding = findingById.get(parsed.findingId);
    if (finding === undefined) {
      record.status = "ineligible";
      record.errors.push("Disposition references an unknown finding.");
      records.push(record);
      continue;
    }

    if ([...parsed.rationale].length < policy.exceptions.minimumRationaleLength) {
      record.status = "ineligible";
      record.errors.push("Disposition rationale is shorter than policy permits.");
      records.push(record);
      continue;
    }

    if (parsed.decision === "accept-exception") {
      const expiry = parsed.expires;
      const stateAllowed = policy.exceptions.allowedFindingStates.includes(finding.state);
      const severityAllowed =
        severityRank(finding.severity) <= severityRank(policy.exceptions.maximumSeverity);
      if (!finding.exceptionable || !stateAllowed || !severityAllowed) {
        record.status = "ineligible";
        record.errors.push("Finding is not eligible for an exception.");
        records.push(record);
        continue;
      }
      if (expiry === null) {
        record.status = "ineligible";
        record.errors.push("Exception expiry is required.");
        records.push(record);
        continue;
      }
      if (expiryEnd(expiry).valueOf() < new Date(input.evaluatedAt).valueOf()) {
        record.status = "expired";
        record.errors.push("Exception has expired.");
        records.push(record);
        continue;
      }
      const duration = calendarDayDistance(comment.recordedAt, expiry);
      if (duration < 0 || duration > policy.exceptions.maximumDurationDays) {
        record.status = "ineligible";
        record.errors.push("Exception duration exceeds policy.");
        records.push(record);
        continue;
      }
      record.status = "accepted";
    } else {
      record.status = parsed.decision === "reject" ? "rejected" : "remediation-requested";
    }

    const previousIndex = currentRecordByFinding.get(parsed.findingId);
    if (previousIndex !== undefined) {
      const previous = records[previousIndex];
      if (previous !== undefined) {
        previous.status = "superseded";
        previous.effective = false;
      }
    }
    record.effective = true;
    currentRecordByFinding.set(parsed.findingId, records.length);
    records.push(record);
  }

  const accepted = new Set<string>();
  const forcedBlockers = new Set<string>();
  let validUntil: string | null = null;
  for (const record of records) {
    if (!record.effective || record.findingId === null) {
      continue;
    }
    if (record.decision === "accept-exception" && record.expires !== null) {
      accepted.add(record.findingId);
      const candidate = expiryEnd(record.expires).toISOString();
      validUntil =
        validUntil === null || compareStrings(candidate, validUntil) < 0 ? candidate : validUntil;
    } else {
      forcedBlockers.add(record.findingId);
    }
  }

  for (const finding of findings) {
    if (accepted.has(finding.id)) {
      finding.state = "exception";
      finding.summary = truncate(
        `${finding.summary} A SHA-bound human exception is effective.`,
        1000,
      );
    }
  }
  return { findings, records, forcedBlockers, validUntil };
}

function ensureRawIntegrity(raw: RawEvidence): void {
  verifyArtifactDigest(raw);
  for (const finding of raw.findings) {
    if (finding.sourceSha !== raw.headSha) {
      throw new AgentProofError(
        "AP_FINDING_SHA_MISMATCH",
        `Finding ${finding.id} is not bound to the evidence head SHA.`,
      );
    }
    if (finding.state === "exception") {
      throw new AgentProofError(
        "AP_RAW_EXCEPTION_FORBIDDEN",
        `Raw finding ${finding.id} cannot assert a human exception.`,
      );
    }
  }
}

function countStates(findings: readonly Finding[]): {
  pass: number;
  fail: number;
  unknown: number;
  exception: number;
} {
  const counts = { pass: 0, fail: 0, unknown: 0, exception: 0 };
  for (const finding of findings) {
    counts[finding.state] += 1;
  }
  return counts;
}

export function evaluateEvidence(input: EvaluateEvidenceInput): FinalEvidence {
  const raw = parseRawEvidence(input.rawEvidence);
  const policy = parseReleasePolicy(input.policy);
  const dispositions = parseDispositionInput(input.dispositions);
  ensureRawIntegrity(raw);

  const materialized = materializeFindings(raw, policy);
  const dispositionResult = applyDispositions(materialized, dispositions, policy, raw.headSha);
  const acceptedIds = new Set(
    dispositionResult.records
      .filter((record) => record.effective && record.decision === "accept-exception")
      .flatMap((record) => (record.findingId === null ? [] : [record.findingId])),
  );
  const unresolved = dispositionResult.findings
    .filter(
      (finding) =>
        dispositionResult.forcedBlockers.has(finding.id) ||
        (finding.state !== "pass" &&
          !(finding.state === "exception" && acceptedIds.has(finding.id))),
    )
    .map((finding) => finding.id)
    .sort();

  const policyDigest = canonicalSha256(policy);
  const diagnostics: Diagnostic[] = [...raw.diagnostics];
  const unsigned: FinalEvidence = {
    schemaVersion: raw.schemaVersion,
    documentType: "final",
    repository: raw.repository,
    pullRequestNumber: raw.pullRequestNumber,
    baseSha: raw.baseSha,
    headSha: raw.headSha,
    generatedAt: dispositions.evaluatedAt,
    generatorVersion: AGENTPROOF_VERSION,
    origin: raw.origin,
    policy: {
      path: policy.path,
      version: policy.version,
      baseSha: raw.baseSha,
      sha256: policyDigest,
    },
    tools: raw.tools,
    findings: dispositionResult.findings,
    diagnostics,
    dispositions: dispositionResult.records,
    reviewerNotes: raw.reviewerNotes,
    gate: {
      conclusion: unresolved.length === 0 ? "success" : "failure",
      unresolvedFindingIds: unresolved,
      counts: countStates(dispositionResult.findings),
      evaluatedAt: dispositions.evaluatedAt,
      validUntil: dispositionResult.validUntil,
    },
    artifact: {
      sha256: ZERO_SHA256,
      workflowRunUrl:
        input.workflowRunUrl === undefined ? raw.artifact.workflowRunUrl : input.workflowRunUrl,
    },
  };
  const normalized = finalEvidenceSchema.parse(unsigned);
  return finalEvidenceSchema.parse(withArtifactDigest(normalized));
}

export function isBlockingState(state: Finding["state"]): boolean {
  return state !== "pass";
}
