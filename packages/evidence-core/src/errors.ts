import type { ZodIssue } from "zod";

export class AgentProofError extends Error {
  public readonly code: string;
  public readonly details: readonly string[];

  public constructor(code: string, message: string, details: readonly string[] = []) {
    super(message);
    this.name = "AgentProofError";
    this.code = code;
    this.details = details;
  }
}

export function formatZodIssues(issues: readonly ZodIssue[]): string[] {
  return issues.map((issue) => {
    const path = issue.path.length === 0 ? "$" : `$.${issue.path.join(".")}`;
    return `${path}: ${issue.message}`;
  });
}

export function asAgentProofError(error: unknown): AgentProofError {
  if (error instanceof AgentProofError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return new AgentProofError("AP_INTERNAL_ERROR", message);
}
