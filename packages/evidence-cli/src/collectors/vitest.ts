import { FINDING_IDS, sha256, type Finding } from "@agentproof/evidence-core";
import { z } from "zod";

import {
  collectorDiagnostic,
  type CollectorResult,
  type CommandExecution,
  type TextCollectorSource,
} from "./types.js";

const assertionSchema = z
  .object({
    ancestorTitles: z.array(z.string().max(500)).max(30).optional(),
    title: z.string().max(500),
    fullName: z.string().max(1000).optional(),
    status: z.string().max(30),
  })
  .passthrough();

const testResultSchema = z
  .object({
    assertionResults: z.array(assertionSchema).max(20_000),
  })
  .passthrough();

const vitestReportSchema = z
  .object({
    testResults: z.array(testResultSchema).max(5_000),
    numTotalTests: z.number().int().nonnegative().optional(),
    numPassedTests: z.number().int().nonnegative().optional(),
    numFailedTests: z.number().int().nonnegative().optional(),
    numPendingTests: z.number().int().nonnegative().optional(),
    success: z.boolean().optional(),
  })
  .passthrough();

const coverageMetricSchema = z
  .object({
    total: z.number().int().positive(),
    covered: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    pct: z.number().finite().min(0).max(100),
  })
  .passthrough()
  .superRefine((metric, context) => {
    if (metric.covered > metric.total || metric.skipped > metric.total) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "covered and skipped cannot exceed total",
      });
    }
    const expectedPercentage = Math.floor((metric.covered / metric.total) * 10_000) / 100;
    if (Math.abs(metric.pct - expectedPercentage) > 0.001) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "coverage percentage does not match covered and total",
      });
    }
  });

const coverageReportSchema = z
  .object({
    total: z
      .object({
        lines: coverageMetricSchema,
        functions: coverageMetricSchema,
        branches: coverageMetricSchema,
        statements: coverageMetricSchema,
      })
      .passthrough(),
  })
  .passthrough();

const TEST_ID = /\[AP-ID:([a-z0-9][a-z0-9._:-]{1,79})\]/gu;

function reference(
  kind: "test" | "coverage",
  name: string,
  source: TextCollectorSource,
): Finding["evidenceRefs"] {
  return source.path === null && source.content === null
    ? []
    : [
        {
          kind,
          name,
          ...(source.path === null ? {} : { path: source.path }),
          ...(source.content === null ? {} : { sha256: sha256(source.content) }),
        },
      ];
}

function baseFinding(
  id: string,
  title: string,
  sourceSha: string,
  source: TextCollectorSource,
  kind: "test" | "coverage",
): Finding {
  return {
    id,
    category: "test",
    state: "unknown",
    severity: id === FINDING_IDS.testSuite ? "high" : "moderate",
    title,
    summary: "Collector evidence is unavailable.",
    evidenceRefs: reference(kind, title, source),
    exceptionable: false,
    remediationHint: "Repair the trusted test command and rerun analysis.",
    collector: "vitest",
    sourceSha,
    facts: {},
  };
}

function parseJson(source: TextCollectorSource): unknown {
  if (source.content === null) {
    throw new Error(source.error ?? "Report is absent.");
  }
  return JSON.parse(source.content) as unknown;
}

function collectSuite(
  sourceSha: string,
  source: TextCollectorSource,
  command: CommandExecution,
): { finding: Finding; diagnostics: CollectorResult["diagnostics"] } {
  const finding = baseFinding(
    FINDING_IDS.testSuite,
    "Vitest suite passes",
    sourceSha,
    source,
    "test",
  );
  if (command.error !== null || command.exitCode === null || command.exitCode > 1) {
    finding.summary = "Vitest command failed before trustworthy results were produced.";
    finding.facts = { commandExitCode: command.exitCode };
    return {
      finding,
      diagnostics: [
        collectorDiagnostic(
          "vitest",
          "AP_VITEST_TOOL_ERROR",
          command.error ?? `Unexpected Vitest exit code ${String(command.exitCode)}.`,
        ),
      ],
    };
  }

  let parsed: z.infer<typeof vitestReportSchema>;
  try {
    parsed = vitestReportSchema.parse(parseJson(source));
  } catch {
    finding.summary = "Vitest JSON report is absent or malformed.";
    finding.facts = { commandExitCode: command.exitCode };
    return {
      finding,
      diagnostics: [
        collectorDiagnostic(
          "vitest",
          "AP_VITEST_REPORT_INVALID",
          source.error ?? "Vitest JSON report validation failed.",
        ),
      ],
    };
  }

  const assertions = parsed.testResults.flatMap((result) => result.assertionResults);
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let invalidStatus = false;
  const testCases: Array<{ id: string; name: string; status: string }> = [];
  const failedTests: string[] = [];
  for (const assertion of assertions) {
    const normalizedStatus =
      assertion.status === "passed"
        ? "passed"
        : assertion.status === "failed"
          ? "failed"
          : ["pending", "skipped", "todo", "disabled"].includes(assertion.status)
            ? "skipped"
            : null;
    if (normalizedStatus === null) {
      invalidStatus = true;
      continue;
    }
    const name =
      assertion.fullName ?? [...(assertion.ancestorTitles ?? []), assertion.title].join(" ");
    if (normalizedStatus === "passed") {
      passed += 1;
    } else if (normalizedStatus === "failed") {
      failed += 1;
      if (failedTests.length < 50) {
        failedTests.push(name);
      }
    } else {
      skipped += 1;
    }
    for (const match of name.matchAll(TEST_ID)) {
      const id = match[1];
      if (id !== undefined) {
        testCases.push({ id, name, status: normalizedStatus });
      }
    }
  }
  const total = assertions.length;
  const declaredCounts = [
    [parsed.numTotalTests, total],
    [parsed.numPassedTests, passed],
    [parsed.numFailedTests, failed],
    [parsed.numPendingTests, skipped],
  ] as const;
  const inconsistent =
    invalidStatus ||
    testCases.length > 100 ||
    declaredCounts.some(([declared, actual]) => declared !== undefined && declared !== actual) ||
    (parsed.success === true && failed > 0) ||
    (parsed.success === false && failed === 0) ||
    (command.exitCode === 0 && failed > 0) ||
    (command.exitCode === 1 && failed === 0);

  finding.facts = {
    total,
    passed,
    failed,
    skipped,
    commandExitCode: command.exitCode,
    testCases: testCases.slice(0, 100),
    failedTests,
  };
  if (inconsistent) {
    finding.state = "unknown";
    finding.summary = "Vitest report and command result are inconsistent.";
    return {
      finding,
      diagnostics: [
        collectorDiagnostic(
          "vitest",
          "AP_VITEST_REPORT_INCONSISTENT",
          "Vitest counts, statuses, stable IDs, success flag, or exit code disagree.",
        ),
      ],
    };
  }
  if (total === 0) {
    finding.state = "fail";
    finding.summary = "Vitest completed without executing any tests.";
  } else if (failed > 0) {
    finding.state = "fail";
    finding.summary = `${failed} of ${total} Vitest tests failed.`;
  } else {
    finding.state = "pass";
    finding.summary = `All ${total} Vitest tests passed.`;
  }
  return { finding, diagnostics: [] };
}

function collectCoverage(
  sourceSha: string,
  source: TextCollectorSource,
  command: CommandExecution,
): { finding: Finding; diagnostics: CollectorResult["diagnostics"] } {
  const finding = baseFinding(
    FINDING_IDS.testCoverage,
    "Coverage report is available",
    sourceSha,
    source,
    "coverage",
  );
  if (command.error !== null || command.exitCode === null || command.exitCode > 1) {
    finding.summary = "Coverage command failed before trustworthy results were produced.";
    finding.facts = { commandExitCode: command.exitCode };
    return {
      finding,
      diagnostics: [
        collectorDiagnostic(
          "vitest",
          "AP_COVERAGE_TOOL_ERROR",
          command.error ?? `Unexpected coverage exit code ${String(command.exitCode)}.`,
        ),
      ],
    };
  }

  let parsed: z.infer<typeof coverageReportSchema>;
  try {
    parsed = coverageReportSchema.parse(parseJson(source));
  } catch {
    finding.summary = "Coverage JSON report is absent or malformed.";
    return {
      finding,
      diagnostics: [
        collectorDiagnostic(
          "vitest",
          "AP_COVERAGE_REPORT_INVALID",
          source.error ?? "Coverage JSON report validation failed.",
        ),
      ],
    };
  }
  finding.state = "pass";
  finding.summary = "Coverage JSON contains all protected metrics.";
  finding.facts = {
    linesPct: parsed.total.lines.pct,
    functionsPct: parsed.total.functions.pct,
    branchesPct: parsed.total.branches.pct,
    statementsPct: parsed.total.statements.pct,
  };
  return { finding, diagnostics: [] };
}

export interface VitestCollectorInput {
  readonly sourceSha: string;
  readonly report: TextCollectorSource;
  readonly coverage: TextCollectorSource;
  readonly command: CommandExecution;
}

export function collectVitest(input: VitestCollectorInput): CollectorResult {
  const suite = collectSuite(input.sourceSha, input.report, input.command);
  const coverage = collectCoverage(input.sourceSha, input.coverage, input.command);
  if (
    input.command.exitCode === 1 &&
    suite.finding.state === "unknown" &&
    coverage.finding.state === "pass"
  ) {
    coverage.finding.state = "unknown";
    coverage.finding.summary =
      "Coverage cannot be trusted because the Vitest process failure is unexplained.";
  }
  return {
    findings: [suite.finding, coverage.finding],
    diagnostics: [...suite.diagnostics, ...coverage.diagnostics],
  };
}
