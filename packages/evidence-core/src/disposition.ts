import { z } from "zod";

import { DISPOSITION_SCHEMA_VERSION, REPOSITORY_PERMISSIONS } from "./constants.js";
import { AgentProofError, formatZodIssues } from "./errors.js";
import {
  boundedHttpUrlSchema,
  dateSchema,
  findingIdSchema,
  repositoryPermissionSchema,
  shaSchema,
  timestampSchema,
} from "./evidence-schema.js";

export const dispositionCommentInputSchema = z
  .object({
    commentId: z
      .union([
        z
          .string()
          .min(1)
          .max(40)
          .regex(/^[1-9]\d*$/),
        z.number().int().positive().safe(),
      ])
      .transform((value) => String(value)),
    commentUrl: boundedHttpUrlSchema,
    actor: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z0-9][A-Za-z0-9-]*(?:\[bot\])?$/),
    actorPermission: repositoryPermissionSchema,
    body: z.string().max(65_536),
    recordedAt: timestampSchema,
    sourceState: z.enum(["active", "edited-away", "deleted"]),
  })
  .strict();

export const dispositionInputSchema = z
  .object({
    schemaVersion: z.literal(DISPOSITION_SCHEMA_VERSION),
    evaluatedAt: timestampSchema,
    comments: z.array(dispositionCommentInputSchema).max(1000),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = new Set<string>();
    for (const [index, comment] of value.comments.entries()) {
      if (ids.has(comment.commentId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["comments", index, "commentId"],
          message: `Duplicate commentId: ${comment.commentId}`,
        });
      }
      ids.add(comment.commentId);
    }
  });

export type DispositionCommentInput = z.infer<typeof dispositionCommentInputSchema>;
export type DispositionInput = z.infer<typeof dispositionInputSchema>;

export const githubDispositionCommentSchema = z
  .object({
    commentId: z.union([
      z
        .string()
        .min(1)
        .max(40)
        .regex(/^[1-9]\d*$/),
      z.number().int().positive().safe(),
    ]),
    nodeId: z.string().min(1).max(200),
    body: z.string().max(65_536),
    author: z.string().min(1).max(100),
    authorAssociation: z.string().min(1).max(30),
    permission: repositoryPermissionSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    url: boundedHttpUrlSchema,
  })
  .strict();

export const githubDispositionInputSchema = z.array(githubDispositionCommentSchema).max(1000);

export type DispositionDecision = "accept-exception" | "request-remediation" | "reject";

export interface ParsedDispositionCommand {
  readonly decision: DispositionDecision;
  readonly findingId: string;
  readonly headSha: string;
  readonly rationale: string;
  readonly expires: string | null;
}

export function parseDispositionInput(
  input: unknown,
  evaluatedAt = new Date().toISOString(),
): DispositionInput {
  if (Array.isArray(input)) {
    const githubResult = githubDispositionInputSchema.safeParse(input);
    if (!githubResult.success) {
      throw new AgentProofError(
        "AP_DISPOSITIONS_INVALID",
        "GitHub disposition input validation failed.",
        formatZodIssues(githubResult.error.issues),
      );
    }
    return parseDispositionInput({
      schemaVersion: DISPOSITION_SCHEMA_VERSION,
      evaluatedAt,
      comments: githubResult.data.map((comment) => ({
        commentId: comment.commentId,
        commentUrl: comment.url,
        actor: comment.author,
        actorPermission: comment.permission,
        body: comment.body,
        recordedAt: comment.updatedAt,
        sourceState: "active",
      })),
    });
  }
  const result = dispositionInputSchema.safeParse(input);
  if (!result.success) {
    throw new AgentProofError(
      "AP_DISPOSITIONS_INVALID",
      "Disposition input validation failed.",
      formatZodIssues(result.error.issues),
    );
  }
  return result.data;
}

function commandError(message: string): never {
  throw new AgentProofError("AP_DISPOSITION_COMMAND_INVALID", message);
}

export function parseDispositionCommand(body: string): ParsedDispositionCommand {
  if (Buffer.byteLength(body, "utf8") > 4000 || body.includes("\0")) {
    commandError("Disposition command exceeds its bound or contains NUL.");
  }

  const normalized = body.replace(/\r\n?/gu, "\n");
  const lines = normalized.endsWith("\n")
    ? normalized.slice(0, -1).split("\n")
    : normalized.split("\n");

  const firstLine = lines[0] ?? "";
  const commandMatch =
    /^\/agentproof (accept-exception|request-remediation|reject) (AP-[A-Z0-9]+(?:-[A-Z0-9]+)+)$/u.exec(
      firstLine,
    );
  if (commandMatch === null) {
    commandError("First line must be an exact /agentproof decision and finding ID.");
  }

  const decisionResult = z
    .enum(["accept-exception", "request-remediation", "reject"])
    .safeParse(commandMatch[1]);
  const findingResult = findingIdSchema.safeParse(commandMatch[2]);
  if (!decisionResult.success || !findingResult.success) {
    commandError("Disposition decision or finding ID is invalid.");
  }
  const decision = decisionResult.data;

  const expectedLineCount = decision === "accept-exception" ? 4 : 3;
  if (lines.length !== expectedLineCount) {
    commandError(`The ${decision} command must contain exactly ${expectedLineCount} lines.`);
  }

  const shaMatch = /^sha: ([0-9a-fA-F]{40})$/u.exec(lines[1] ?? "");
  const reasonMatch = /^reason: (.{1,1000})$/u.exec(lines[2] ?? "");
  if (shaMatch === null || reasonMatch === null) {
    commandError("Disposition sha or reason line is malformed.");
  }

  const shaResult = shaSchema.safeParse(shaMatch[1]);
  const reasonResult = z.string().min(1).max(1000).safeParse(reasonMatch[1]);
  if (!shaResult.success || !reasonResult.success) {
    commandError("Disposition SHA or reason is invalid.");
  }

  const rationale = reasonResult.data.trim();
  if (rationale.length === 0) {
    commandError("Disposition reason cannot be blank.");
  }

  let expires: string | null = null;
  if (decision === "accept-exception") {
    const expiryMatch = /^expires: (\d{4}-\d{2}-\d{2})$/u.exec(lines[3] ?? "");
    if (expiryMatch === null) {
      commandError("Accept-exception requires an exact expires: YYYY-MM-DD line.");
    }
    const expiryResult = dateSchema.safeParse(expiryMatch[1]);
    if (!expiryResult.success || !isRealCalendarDate(expiryResult.data)) {
      commandError("Disposition expiry is not a real calendar date.");
    }
    expires = expiryResult.data;
  }

  return {
    decision,
    findingId: findingResult.data,
    headSha: shaResult.data,
    rationale,
    expires,
  };
}

export function isRealCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function expiryEnd(value: string): Date {
  if (!isRealCalendarDate(value)) {
    throw new AgentProofError(
      "AP_DISPOSITION_EXPIRY_INVALID",
      "Disposition expiry is not a real calendar date.",
    );
  }
  return new Date(`${value}T23:59:59.999Z`);
}

export function calendarDayDistance(fromTimestamp: string, toDate: string): number {
  const from = new Date(fromTimestamp);
  const to = new Date(`${toDate}T00:00:00.000Z`);
  const fromMidnight = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  return Math.round((to.valueOf() - fromMidnight) / 86_400_000);
}

export function hasMinimumPermission(
  actual: (typeof REPOSITORY_PERMISSIONS)[number],
  minimum: (typeof REPOSITORY_PERMISSIONS)[number],
): boolean {
  return REPOSITORY_PERMISSIONS.indexOf(actual) >= REPOSITORY_PERMISSIONS.indexOf(minimum);
}
