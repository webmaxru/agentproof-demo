import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  AGENTPROOF_VERSION,
  FINDING_IDS,
  ZERO_SHA256,
  boundedHttpUrlSchema,
  rawEvidenceSchema,
  withArtifactDigest,
  type Finding,
  type RawEvidence,
} from "@agentproof/evidence-core";

import { prepareCollectorWorkspace, removeCollectorWorkspace } from "../collector-workspace.js";
import { runBoundedCommand } from "../command-runner.js";
import { collectDataRetention } from "../collectors/data-retention.js";
import { collectNpmAudit } from "../collectors/npm-audit.js";
import { collectOrigin } from "../collectors/origin.js";
import { collectVitest } from "../collectors/vitest.js";
import {
  readJsonFile,
  readCollectorOutput,
  readWorkspaceSource,
  resolveWorkspaceDirectory,
  writeJsonAtomic,
} from "../io.js";
import {
  isReportAnalyzeMetadata,
  parseAnalyzeMetadata,
  type AnalyzeMetadata,
  type PullRequestAnalyzeMetadata,
  type ReportAnalyzeMetadata,
} from "../metadata.js";
import type { TextCollectorSource } from "../collectors/types.js";
import { resolveTrustedNpm, resolveTrustedVitest } from "../trusted-tools.js";

const REPORT_LIMIT = 10 * 1024 * 1024;
const DECLARATION_LIMIT = 256 * 1024;

export interface AnalyzeWorkspaceOptions {
  readonly workspacePath: string;
  readonly metadata: unknown;
  readonly collectorDirectoryPath?: string;
}

export interface AnalyzeCommandOptions {
  readonly workspacePath: string;
  readonly metadataPath: string;
  readonly outputPath: string;
}

interface NormalizedCollectorInputs {
  readonly metadata: {
    readonly schemaVersion: "1.0.0";
    readonly repository: string;
    readonly pullRequestNumber: number;
    readonly baseSha: string;
    readonly headSha: string;
    readonly generatedAt: string;
    readonly workflowRunUrl: string | null;
    readonly origin: {
      readonly pullRequestBody: string | null;
      readonly githubAttribution: {
        readonly tool: string;
        readonly url: string | null;
      } | null;
    };
    readonly tools: {
      readonly npmVersion: string | null;
      readonly vitestVersion: string | null;
      readonly auditDatabaseUpdatedAt: string | null;
    };
  };
  readonly vitestReport: TextCollectorSource;
  readonly coverageReport: TextCollectorSource;
  readonly npmAuditReport: TextCollectorSource;
  readonly retentionDeclaration: TextCollectorSource;
  readonly vitestCommand: {
    readonly exitCode: number | null;
    readonly error: string | null;
  };
  readonly npmAuditCommand: {
    readonly exitCode: number | null;
    readonly error: string | null;
  };
}

function normalizedPullRequestMetadata(
  metadata: PullRequestAnalyzeMetadata,
): NormalizedCollectorInputs["metadata"] {
  const workflowRunUrlCandidate =
    process.env.GITHUB_SERVER_URL !== undefined && process.env.GITHUB_RUN_ID !== undefined
      ? `${process.env.GITHUB_SERVER_URL}/${metadata.repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null;
  const workflowRunUrl =
    workflowRunUrlCandidate === null
      ? null
      : (boundedHttpUrlSchema.safeParse(workflowRunUrlCandidate).data ?? null);
  return {
    schemaVersion: metadata.schemaVersion,
    repository: metadata.repository,
    pullRequestNumber: metadata.pullRequestNumber,
    baseSha: metadata.baseSha,
    headSha: metadata.headSha,
    generatedAt: new Date().toISOString(),
    workflowRunUrl,
    origin: {
      pullRequestBody: metadata.pullRequestBody,
      githubAttribution: null,
    },
    tools: {
      npmVersion: null,
      vitestVersion: null,
      auditDatabaseUpdatedAt: null,
    },
  };
}

function normalizedMetadata(metadata: AnalyzeMetadata): NormalizedCollectorInputs["metadata"] {
  return isReportAnalyzeMetadata(metadata) ? metadata : normalizedPullRequestMetadata(metadata);
}

async function inputsFromReports(
  workspacePath: string,
  metadata: ReportAnalyzeMetadata,
): Promise<NormalizedCollectorInputs> {
  const [vitestReport, coverageReport, npmAuditReport, retentionDeclaration] = await Promise.all([
    readWorkspaceSource(workspacePath, metadata.sources.vitest.reportPath, REPORT_LIMIT),
    readWorkspaceSource(workspacePath, metadata.sources.vitest.coveragePath, REPORT_LIMIT),
    readWorkspaceSource(workspacePath, metadata.sources.npmAudit.reportPath, REPORT_LIMIT),
    readWorkspaceSource(
      workspacePath,
      metadata.sources.dataRetention.declarationPath,
      DECLARATION_LIMIT,
    ),
  ]);
  return {
    metadata,
    vitestReport,
    coverageReport,
    npmAuditReport,
    retentionDeclaration,
    vitestCommand: metadata.sources.vitest.command,
    npmAuditCommand: metadata.sources.npmAudit.command,
  };
}

async function inputsFromPullRequest(
  workspacePath: string,
  metadata: PullRequestAnalyzeMetadata,
  collectorDirectoryPath: string | undefined,
): Promise<NormalizedCollectorInputs> {
  const normalizedMetadata = normalizedPullRequestMetadata(metadata);
  const unavailable = (message: string, path: string | null = null): TextCollectorSource => ({
    content: null,
    path,
    error: message,
  });

  const repository = await resolveWorkspaceDirectory(workspacePath, ".");
  let application: Awaited<ReturnType<typeof resolveWorkspaceDirectory>> | null;
  try {
    application = await resolveWorkspaceDirectory(workspacePath, metadata.appPath);
  } catch {
    application = null;
  }
  const retentionPath =
    application === null
      ? null
      : application.logicalPath === ""
        ? "config/data-handling.yml"
        : `${application.logicalPath}/config/data-handling.yml`;
  const retentionDeclaration =
    retentionPath === null
      ? unavailable("Application directory is absent or outside the repository.")
      : await readWorkspaceSource(workspacePath, retentionPath, DECLARATION_LIMIT);
  let npmTool: Awaited<ReturnType<typeof resolveTrustedNpm>> | null;
  try {
    npmTool = await resolveTrustedNpm();
  } catch {
    npmTool = null;
  }
  const [npmAuditCommand, npmVersionCommand] =
    npmTool === null
      ? ([
          {
            exitCode: null,
            stdout: "",
            error: "Trusted npm installation is unavailable to the analyzer.",
          },
          {
            exitCode: null,
            stdout: "",
            error: "Trusted npm installation is unavailable to the analyzer.",
          },
        ] as const)
      : await Promise.all([
          runBoundedCommand({
            command: npmTool.command,
            args: [
              ...npmTool.argsPrefix,
              "audit",
              "--ignore-scripts",
              "--omit=dev",
              "--audit-level=high",
              "--json",
            ],
            cwd: repository.absolutePath,
            timeoutMs: 2 * 60 * 1000,
            environment: {
              npm_config_ignore_scripts: "true",
            },
          }),
          runBoundedCommand({
            command: npmTool.command,
            args: [...npmTool.argsPrefix, "--version"],
            cwd: repository.absolutePath,
            timeoutMs: 30_000,
            maximumOutputBytes: 1024,
          }),
        ]);
  const npmAuditReport: TextCollectorSource = {
    content: npmAuditCommand.stdout.length === 0 ? null : npmAuditCommand.stdout,
    path: null,
    error:
      npmAuditCommand.stdout.length === 0
        ? (npmAuditCommand.error ?? "npm audit produced no JSON.")
        : null,
  };

  let trustedVitest: Awaited<ReturnType<typeof resolveTrustedVitest>> | null = null;
  let trustedVitestError: string | null = null;
  try {
    trustedVitest = await resolveTrustedVitest();
  } catch {
    trustedVitestError = "Trusted Vitest installation is unavailable to the analyzer.";
  }

  let vitestReport = unavailable("Vitest collector did not run.");
  let coverageReport = unavailable("Coverage collector did not run.");
  let vitestCommand: NormalizedCollectorInputs["vitestCommand"];
  if (application !== null && trustedVitest !== null && collectorDirectoryPath !== undefined) {
    let collectorWorkspace: Awaited<ReturnType<typeof prepareCollectorWorkspace>> | undefined;
    try {
      collectorWorkspace = await prepareCollectorWorkspace(
        application,
        collectorDirectoryPath,
        trustedVitest.nodeModulesPath,
      );
      const command = await runBoundedCommand({
        command: trustedVitest.command,
        args: [
          ...trustedVitest.argsPrefix,
          "run",
          "--config",
          collectorWorkspace.configPath,
          "--root",
          collectorWorkspace.appPath,
          "--coverage",
          "--reporter=json",
          "--outputFile",
          collectorWorkspace.testReportPath,
        ],
        cwd: collectorWorkspace.appPath,
        timeoutMs: 10 * 60 * 1000,
      });
      vitestCommand = {
        exitCode: command.exitCode,
        error: command.error,
      };
      [vitestReport, coverageReport] = await Promise.all([
        readCollectorOutput(collectorWorkspace.testReportPath, REPORT_LIMIT),
        readCollectorOutput(collectorWorkspace.coverageReportPath, REPORT_LIMIT),
      ]);
    } catch {
      vitestCommand = {
        exitCode: null,
        error: "Isolated Vitest collector workspace failed.",
      };
    } finally {
      if (collectorWorkspace !== undefined) {
        try {
          await removeCollectorWorkspace(collectorWorkspace.root);
        } catch {
          // Collector cleanup cannot suppress the already normalized evidence.
        }
      }
    }
  } else {
    const reason =
      application === null
        ? "Application directory is absent or outside the repository."
        : (trustedVitestError ?? "An isolated collector directory was not supplied.");
    vitestReport = unavailable(reason);
    coverageReport = unavailable(reason);
    vitestCommand = { exitCode: null, error: reason };
  }

  return {
    metadata: {
      ...normalizedMetadata,
      tools: {
        npmVersion:
          npmVersionCommand.exitCode === 0
            ? npmVersionCommand.stdout.trim().slice(0, 80) || null
            : null,
        vitestVersion: trustedVitest?.version ?? null,
        auditDatabaseUpdatedAt: null,
      },
    },
    vitestReport,
    coverageReport,
    npmAuditReport,
    retentionDeclaration,
    vitestCommand,
    npmAuditCommand: {
      exitCode: npmAuditCommand.exitCode,
      error: npmAuditCommand.error,
    },
  };
}

function buildRawEvidence(inputs: NormalizedCollectorInputs): RawEvidence {
  const { metadata } = inputs;

  const vitest = collectVitest({
    sourceSha: metadata.headSha,
    report: inputs.vitestReport,
    coverage: inputs.coverageReport,
    command: inputs.vitestCommand,
  });
  const npmAudit = collectNpmAudit({
    sourceSha: metadata.headSha,
    report: inputs.npmAuditReport,
    command: inputs.npmAuditCommand,
  });
  const dataRetention = collectDataRetention({
    sourceSha: metadata.headSha,
    declaration: inputs.retentionDeclaration,
  });
  const origin = collectOrigin(metadata.headSha, metadata.origin);

  const unsigned: RawEvidence = {
    schemaVersion: metadata.schemaVersion,
    documentType: "raw",
    repository: metadata.repository,
    pullRequestNumber: metadata.pullRequestNumber,
    baseSha: metadata.baseSha,
    headSha: metadata.headSha,
    generatedAt: metadata.generatedAt,
    generatorVersion: AGENTPROOF_VERSION,
    origin: origin.origin,
    tools: {
      nodeVersion: process.version,
      npmVersion: metadata.tools.npmVersion,
      vitestVersion: metadata.tools.vitestVersion,
      auditDatabaseUpdatedAt: metadata.tools.auditDatabaseUpdatedAt,
      agentproofVersion: AGENTPROOF_VERSION,
    },
    findings: [
      ...vitest.findings,
      ...npmAudit.findings,
      ...dataRetention.findings,
      ...origin.findings,
    ],
    diagnostics: [
      ...vitest.diagnostics,
      ...npmAudit.diagnostics,
      ...dataRetention.diagnostics,
      ...origin.diagnostics,
    ],
    reviewerNotes: [],
    artifact: {
      sha256: ZERO_SHA256,
      workflowRunUrl: metadata.workflowRunUrl,
    },
  };
  return finalizeRawEvidence(unsigned);
}

function finalizeRawEvidence(evidence: RawEvidence): RawEvidence {
  evidence.artifact.sha256 = ZERO_SHA256;
  const normalized = rawEvidenceSchema.parse(evidence);
  return rawEvidenceSchema.parse(withArtifactDigest(normalized));
}

function emergencyFinding(
  id: string,
  category: Finding["category"],
  severity: Finding["severity"],
  title: string,
  collector: string,
  sourceSha: string,
  exceptionable: boolean,
): Finding {
  return {
    id,
    category,
    state: "unknown",
    severity,
    title,
    summary: "Collector execution did not produce trustworthy evidence.",
    evidenceRefs: [],
    exceptionable,
    remediationHint: "Repair the collector and regenerate evidence for this SHA.",
    collector,
    sourceSha,
    facts: { failureCode: "AP_ANALYZE_COLLECTOR_ERROR" },
  };
}

function buildEmergencyRawEvidence(metadata: NormalizedCollectorInputs["metadata"]): RawEvidence {
  return finalizeRawEvidence({
    schemaVersion: metadata.schemaVersion,
    documentType: "raw",
    repository: metadata.repository,
    pullRequestNumber: metadata.pullRequestNumber,
    baseSha: metadata.baseSha,
    headSha: metadata.headSha,
    generatedAt: metadata.generatedAt,
    generatorVersion: AGENTPROOF_VERSION,
    origin: {
      classification: "unknown",
      declaredTool: null,
      source: "none",
    },
    tools: {
      nodeVersion: process.version,
      npmVersion: metadata.tools.npmVersion,
      vitestVersion: metadata.tools.vitestVersion,
      auditDatabaseUpdatedAt: metadata.tools.auditDatabaseUpdatedAt,
      agentproofVersion: AGENTPROOF_VERSION,
    },
    findings: [
      emergencyFinding(
        FINDING_IDS.testSuite,
        "test",
        "high",
        "Vitest suite evidence is unavailable",
        "vitest",
        metadata.headSha,
        false,
      ),
      emergencyFinding(
        FINDING_IDS.testCoverage,
        "test",
        "moderate",
        "Coverage evidence is unavailable",
        "vitest",
        metadata.headSha,
        false,
      ),
      emergencyFinding(
        FINDING_IDS.npmAudit,
        "security",
        "high",
        "Dependency audit evidence is unavailable",
        "npm-audit",
        metadata.headSha,
        false,
      ),
      emergencyFinding(
        FINDING_IDS.dataRetention,
        "policy",
        "moderate",
        "Data-retention evidence is unavailable",
        "data-retention",
        metadata.headSha,
        true,
      ),
      emergencyFinding(
        FINDING_IDS.origin,
        "provenance",
        "low",
        "Origin evidence is unavailable",
        "origin",
        metadata.headSha,
        true,
      ),
    ],
    diagnostics: [
      {
        collector: "analyzer",
        level: "error",
        code: "AP_ANALYZE_COLLECTOR_ERROR",
        message: "Collector orchestration failed; every affected result is explicitly unknown.",
      },
    ],
    reviewerNotes: [],
    artifact: {
      sha256: ZERO_SHA256,
      workflowRunUrl: metadata.workflowRunUrl,
    },
  });
}

export async function analyzeWorkspace(options: AnalyzeWorkspaceOptions): Promise<RawEvidence> {
  const metadata = parseAnalyzeMetadata(options.metadata);
  const identity = normalizedMetadata(metadata);
  try {
    const inputs = isReportAnalyzeMetadata(metadata)
      ? await inputsFromReports(options.workspacePath, metadata)
      : await inputsFromPullRequest(
          options.workspacePath,
          metadata,
          options.collectorDirectoryPath,
        );
    return buildRawEvidence(inputs);
  } catch {
    return buildEmergencyRawEvidence(identity);
  }
}

async function analyzeWithCleanup(
  options: AnalyzeWorkspaceOptions,
  collectorDirectoryPath: string,
): Promise<RawEvidence> {
  try {
    return await analyzeWorkspace(options);
  } finally {
    try {
      await removeCollectorWorkspace(collectorDirectoryPath);
    } catch {
      // Cleanup failure must not suppress a normalized evidence artifact.
    }
  }
}

export async function analyzeCommand(options: AnalyzeCommandOptions): Promise<RawEvidence> {
  const metadata = await readJsonFile(options.metadataPath, 1024 * 1024);
  const collectorDirectoryPath = await mkdtemp(join(tmpdir(), "agentproof-collectors-"));
  const evidence = await analyzeWithCleanup(
    {
      workspacePath: options.workspacePath,
      metadata,
      collectorDirectoryPath,
    },
    collectorDirectoryPath,
  );
  await writeJsonAtomic(options.outputPath, evidence);
  return evidence;
}
