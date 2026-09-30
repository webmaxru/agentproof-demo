#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import {
  EVIDENCE_SCHEMA_VERSION,
  asAgentProofError,
  type FinalEvidence,
  type RawEvidence,
} from "@agentproof/evidence-core";

import { parseCliArgs } from "./args.js";
import { analyzeCommand } from "./commands/analyze.js";
import { assembleCommand } from "./commands/assemble.js";
import { evaluateCommand } from "./commands/evaluate.js";

export const USAGE = `Usage:
  agentproof analyze --workspace <path> --metadata <json> --output <json>
  agentproof evaluate --evidence <json> --policy <yml> --dispositions <json> --output <json>
  agentproof assemble --fragments <evidence.json> <review.json...> --output <json>
`;

export interface CliIo {
  readonly stdout: (value: string) => void;
  readonly stderr: (value: string) => void;
}

const processIo: CliIo = {
  stdout: (value) => {
    process.stdout.write(value);
  },
  stderr: (value) => {
    process.stderr.write(value);
  },
};

function resultLine(
  command: string,
  outputPath: string,
  evidence: RawEvidence | FinalEvidence,
): string {
  const gate = evidence.documentType === "final" ? { conclusion: evidence.gate.conclusion } : {};
  return `${JSON.stringify({
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    command,
    output: outputPath,
    artifactSha256: evidence.artifact.sha256,
    ...gate,
  })}\n`;
}

export async function runCli(argv: readonly string[], io: CliIo = processIo): Promise<number> {
  try {
    const parsed = parseCliArgs(argv);
    if (parsed.command === "help") {
      io.stdout(USAGE);
      return 0;
    }
    if (parsed.command === "analyze") {
      const evidence = await analyzeCommand(parsed);
      io.stdout(resultLine(parsed.command, parsed.outputPath, evidence));
      return 0;
    }
    if (parsed.command === "evaluate") {
      const evidence = await evaluateCommand(parsed);
      io.stdout(resultLine(parsed.command, parsed.outputPath, evidence));
      return evidence.gate.conclusion === "success" ? 0 : 2;
    }
    const evidence = await assembleCommand(parsed);
    io.stdout(resultLine(parsed.command, parsed.outputPath, evidence));
    return 0;
  } catch (error) {
    const normalized = asAgentProofError(error);
    io.stderr(
      `${JSON.stringify({
        schemaVersion: EVIDENCE_SCHEMA_VERSION,
        error: {
          code: normalized.code,
          message: normalized.message,
          details: normalized.details,
        },
      })}\n`,
    );
    return 1;
  }
}

const entryPoint = process.argv[1];
if (entryPoint !== undefined && import.meta.url === pathToFileURL(entryPoint).href) {
  process.exitCode = await runCli(process.argv.slice(2));
}
