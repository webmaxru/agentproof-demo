import type { Diagnostic, Finding } from "@agentproof/evidence-core";

export interface CommandExecution {
  readonly exitCode: number | null;
  readonly error: string | null;
}

export interface CollectorResult {
  readonly findings: Finding[];
  readonly diagnostics: Diagnostic[];
}

export interface TextCollectorSource {
  readonly content: string | null;
  readonly path: string | null;
  readonly error: string | null;
}

export function collectorDiagnostic(collector: string, code: string, message: string): Diagnostic {
  return {
    collector,
    level: "error",
    code,
    message: message.slice(0, 500),
  };
}
