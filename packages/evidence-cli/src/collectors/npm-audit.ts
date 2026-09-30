import {
  FINDING_IDS,
  SEVERITIES,
  sha256,
  type Finding,
  type JsonValue,
} from "@agentproof/evidence-core";
import { z } from "zod";

import {
  collectorDiagnostic,
  type CollectorResult,
  type CommandExecution,
  type TextCollectorSource,
} from "./types.js";

const severitySchema = z.enum(SEVERITIES);
const viaObjectSchema = z
  .object({
    source: z.union([z.string().max(200), z.number().int()]).optional(),
    severity: severitySchema.optional(),
  })
  .passthrough();

const vulnerabilitySchema = z
  .object({
    name: z.string().min(1).max(214),
    severity: severitySchema,
    isDirect: z.boolean(),
    via: z.array(z.union([z.string().max(214), viaObjectSchema])).max(100),
  })
  .passthrough();

const countsSchema = z
  .object({
    info: z.number().int().nonnegative(),
    low: z.number().int().nonnegative(),
    moderate: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
    critical: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  })
  .passthrough()
  .superRefine((counts, context) => {
    const sum = counts.info + counts.low + counts.moderate + counts.high + counts.critical;
    if (sum !== counts.total) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "npm audit vulnerability counts do not sum to total",
      });
    }
  });

const auditReportSchema = z
  .object({
    auditReportVersion: z.literal(2),
    vulnerabilities: z.record(vulnerabilitySchema),
    metadata: z
      .object({
        vulnerabilities: countsSchema,
      })
      .passthrough(),
  })
  .passthrough()
  .superRefine((report, context) => {
    if (Object.keys(report.vulnerabilities).length > 20_000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "npm audit report contains too many vulnerability entries",
      });
    }
  });

function baseFinding(sourceSha: string, source: TextCollectorSource): Finding {
  return {
    id: FINDING_IDS.npmAudit,
    category: "security",
    state: "unknown",
    severity: "high",
    title: "Production dependency audit is trustworthy",
    summary: "npm audit evidence is unavailable.",
    evidenceRefs:
      source.path === null && source.content === null
        ? []
        : [
            {
              kind: "advisory",
              name: "npm audit JSON",
              ...(source.path === null ? {} : { path: source.path }),
              ...(source.content === null ? {} : { sha256: sha256(source.content) }),
            },
          ],
    exceptionable: false,
    remediationHint: "Restore npm audit and remediate vulnerable dependencies.",
    collector: "npm-audit",
    sourceSha,
    facts: {},
  };
}

function highestSeverity(
  counts: z.infer<typeof countsSchema>,
): "none" | (typeof SEVERITIES)[number] {
  for (const severity of [...SEVERITIES].reverse()) {
    if (counts[severity] > 0) {
      return severity;
    }
  }
  return "none";
}

export interface NpmAuditCollectorInput {
  readonly sourceSha: string;
  readonly report: TextCollectorSource;
  readonly command: CommandExecution;
}

export function collectNpmAudit(input: NpmAuditCollectorInput): CollectorResult {
  const finding = baseFinding(input.sourceSha, input.report);
  if (
    input.command.error !== null ||
    input.command.exitCode === null ||
    input.command.exitCode > 1
  ) {
    finding.summary = "npm audit failed before trustworthy results were produced.";
    finding.facts = { commandExitCode: input.command.exitCode };
    return {
      findings: [finding],
      diagnostics: [
        collectorDiagnostic(
          "npm-audit",
          "AP_NPM_AUDIT_TOOL_ERROR",
          input.command.error ??
            `Unexpected npm audit exit code ${String(input.command.exitCode)}.`,
        ),
      ],
    };
  }

  let report: z.infer<typeof auditReportSchema>;
  try {
    if (input.report.content === null) {
      throw new Error(input.report.error ?? "Report is absent.");
    }
    report = auditReportSchema.parse(JSON.parse(input.report.content) as unknown);
  } catch {
    finding.summary = "npm audit JSON report is absent or malformed.";
    return {
      findings: [finding],
      diagnostics: [
        collectorDiagnostic(
          "npm-audit",
          "AP_NPM_AUDIT_REPORT_INVALID",
          input.report.error ?? "npm audit JSON report validation failed.",
        ),
      ],
    };
  }

  const counts = report.metadata.vulnerabilities;
  const highest = highestSeverity(counts);
  const highOrCritical = counts.high + counts.critical > 0;
  const vulnerabilities = Object.values(report.vulnerabilities);
  const vulnerabilityEntries = vulnerabilities.length;
  const derivedCounts = {
    info: 0,
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
  };
  for (const vulnerability of vulnerabilities) {
    derivedCounts[vulnerability.severity] += 1;
  }
  const severityCountMismatch = SEVERITIES.some(
    (severity) => counts[severity] !== derivedCounts[severity],
  );
  if (
    (input.command.exitCode === 0 && highOrCritical) ||
    (input.command.exitCode === 1 && !highOrCritical) ||
    (counts.total === 0 && vulnerabilityEntries > 0) ||
    (counts.total > 0 && vulnerabilityEntries === 0) ||
    severityCountMismatch
  ) {
    finding.summary = "npm audit report conflicts with the mandated high-level exit code.";
    finding.facts = {
      commandExitCode: input.command.exitCode,
      highestSeverity: highest,
    };
    return {
      findings: [finding],
      diagnostics: [
        collectorDiagnostic(
          "npm-audit",
          "AP_NPM_AUDIT_REPORT_INCONSISTENT",
          "npm audit --audit-level=high exit code and report disagree.",
        ),
      ],
    };
  }

  const advisoryIds = new Set<string>();
  const directPackages = new Set<string>();
  for (const vulnerability of vulnerabilities) {
    if (vulnerability.isDirect) {
      directPackages.add(vulnerability.name);
    }
    for (const via of vulnerability.via) {
      if (typeof via === "object" && via.source !== undefined) {
        advisoryIds.add(String(via.source).slice(0, 200));
      }
    }
  }
  const severityCounts: Record<string, JsonValue> = {
    info: counts.info,
    low: counts.low,
    moderate: counts.moderate,
    high: counts.high,
    critical: counts.critical,
  };
  finding.state = counts.total === 0 ? "pass" : "fail";
  finding.summary =
    counts.total === 0
      ? "npm audit reported no production dependency vulnerabilities."
      : `npm audit reported ${counts.total} production dependency vulnerabilities; highest severity is ${highest}.`;
  finding.facts = {
    total: counts.total,
    highestSeverity: highest,
    severityCounts,
    advisoryIds: [...advisoryIds].sort().slice(0, 100),
    directPackages: [...directPackages].sort().slice(0, 100),
    commandExitCode: input.command.exitCode,
  };
  return { findings: [finding], diagnostics: [] };
}
