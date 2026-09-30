import { z } from "zod";

import {
  EVIDENCE_SCHEMA_VERSION,
  FINDING_STATES,
  REPOSITORY_PERMISSIONS,
  SEVERITIES,
} from "./constants.js";
import { AgentProofError, formatZodIssues } from "./errors.js";

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export const shaSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{40}$/, "Expected a complete 40-character Git SHA.")
  .transform((value) => value.toLowerCase());

export const sha256Schema = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, "Expected a 64-character SHA-256 digest.")
  .transform((value) => value.toLowerCase());

export const timestampSchema = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value).toISOString());

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO calendar date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Expected a real calendar date.");

export const repositorySchema = z
  .string()
  .min(3)
  .max(200)
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Expected a GitHub owner/repository name.");

export const findingIdSchema = z
  .string()
  .min(8)
  .max(80)
  .regex(/^AP-[A-Z0-9]+(?:-[A-Z0-9]+)+$/, "Invalid finding ID.");

export const severitySchema = z.enum(SEVERITIES);
export const findingStateSchema = z.enum(FINDING_STATES);
export const repositoryPermissionSchema = z.enum(REPOSITORY_PERMISSIONS);

export const boundedHttpUrlSchema = z
  .string()
  .max(500)
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        (url.protocol === "https:" || url.protocol === "http:") &&
        url.username === "" &&
        url.password === ""
      );
    } catch {
      return false;
    }
  }, "Expected an HTTP(S) URL.");
const relativePathSchema = z
  .string()
  .min(1)
  .max(300)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.startsWith("\\") &&
      !/^[A-Za-z]:/.test(value) &&
      !value.split(/[\\/]/u).includes(".."),
    "Expected a repository-relative path.",
  );

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string().max(1000),
    z.array(jsonValueSchema).max(100),
    z.record(z.string().min(1).max(80), jsonValueSchema),
  ]),
);

function inspectJsonBounds(value: JsonValue, depth = 0): { depth: number; nodes: number } {
  if (value === null || typeof value !== "object") {
    return { depth, nodes: 1 };
  }

  const children = Array.isArray(value) ? value : Object.values(value);
  let maximumDepth = depth;
  let nodes = 1;
  for (const child of children) {
    const inspected = inspectJsonBounds(child, depth + 1);
    maximumDepth = Math.max(maximumDepth, inspected.depth);
    nodes += inspected.nodes;
  }
  return { depth: maximumDepth, nodes };
}

export const findingFactsSchema = z
  .record(
    z
      .string()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z][A-Za-z0-9]*$/),
    jsonValueSchema,
  )
  .superRefine((value, context) => {
    if (Object.keys(value).length > 50) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Finding facts may contain at most 50 top-level keys.",
      });
    }
    const bounds = inspectJsonBounds(value);
    if (bounds.depth > 5 || bounds.nodes > 500) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Finding facts exceed the depth or node limit.",
      });
    }
  });

export const evidenceReferenceSchema = z
  .object({
    kind: z.enum([
      "file",
      "test",
      "coverage",
      "advisory",
      "command",
      "pull-request",
      "policy",
      "workflow",
    ]),
    name: z.string().min(1).max(120),
    path: relativePathSchema.optional(),
    url: boundedHttpUrlSchema.optional(),
    line: z.number().int().positive().optional(),
    sha256: sha256Schema.optional(),
  })
  .strict();

export const findingSchema = z
  .object({
    id: findingIdSchema,
    category: z.enum(["test", "security", "policy", "provenance"]),
    state: findingStateSchema,
    severity: severitySchema,
    title: z.string().min(1).max(120),
    summary: z.string().min(1).max(1000),
    evidenceRefs: z.array(evidenceReferenceSchema).max(50),
    exceptionable: z.boolean(),
    remediationHint: z.string().min(1).max(500),
    collector: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9-]+$/),
    sourceSha: shaSchema,
    facts: findingFactsSchema,
  })
  .strict();

export const originSchema = z
  .object({
    classification: z.enum(["github-attributed", "self-declared", "unknown"]),
    declaredTool: z.string().min(1).max(80).nullable(),
    source: z.enum(["github", "pull-request-body", "none"]),
  })
  .strict();

export const toolsSchema = z
  .object({
    nodeVersion: z.string().min(1).max(80),
    npmVersion: z.string().min(1).max(80).nullable(),
    vitestVersion: z.string().min(1).max(80).nullable(),
    auditDatabaseUpdatedAt: timestampSchema.nullable(),
    agentproofVersion: z.string().min(1).max(80),
  })
  .strict();

export const diagnosticSchema = z
  .object({
    collector: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9-]+$/),
    level: z.enum(["warning", "error"]),
    code: z
      .string()
      .min(1)
      .max(80)
      .regex(/^AP_[A-Z0-9_]+$/),
    message: z.string().min(1).max(500),
  })
  .strict();

export const reviewerNoteInputSchema = z
  .object({
    specialist: z.enum(["test", "security", "policy", "evidence"]),
    sessionUrl: boundedHttpUrlSchema,
    sourceSha: shaSchema,
    summary: z.string().min(1).max(1000),
    findingIds: z.array(findingIdSchema).max(50),
    createdAt: timestampSchema,
  })
  .strict();

export const reviewerNoteSchema = reviewerNoteInputSchema
  .extend({
    fragmentSha256: sha256Schema,
  })
  .strict();

export const artifactSchema = z
  .object({
    sha256: sha256Schema,
    workflowRunUrl: boundedHttpUrlSchema.nullable(),
  })
  .strict();

const evidenceIdentityShape = {
  schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
  repository: repositorySchema,
  pullRequestNumber: z.number().int().positive(),
  baseSha: shaSchema,
  headSha: shaSchema,
} as const;

function uniqueFindingIds(
  value: { findings: readonly { id: string }[] },
  context: z.RefinementCtx,
): void {
  const ids = new Set<string>();
  for (const finding of value.findings) {
    if (ids.has(finding.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["findings"],
        message: `Duplicate finding ID: ${finding.id}`,
      });
    }
    ids.add(finding.id);
  }
}

function validateRawSemantics(
  value: {
    baseSha?: string;
    headSha: string;
    findings: readonly { sourceSha: string }[];
    reviewerNotes?: readonly { sourceSha: string }[];
  },
  context: z.RefinementCtx,
): void {
  if (value.baseSha !== undefined && value.baseSha === value.headSha) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["headSha"],
      message: "baseSha and headSha must identify different commits.",
    });
  }
  value.findings.forEach((finding, index) => {
    if (finding.sourceSha !== value.headSha) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["findings", index, "sourceSha"],
        message: "Finding sourceSha must equal the evidence headSha.",
      });
    }
  });
  value.reviewerNotes?.forEach((note, index) => {
    if (note.sourceSha !== value.headSha) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewerNotes", index, "sourceSha"],
        message: "Reviewer note sourceSha must equal the evidence headSha.",
      });
    }
  });
}

export const rawEvidenceSchema = z
  .object({
    ...evidenceIdentityShape,
    documentType: z.literal("raw"),
    generatedAt: timestampSchema,
    generatorVersion: z.string().min(1).max(80),
    origin: originSchema,
    tools: toolsSchema,
    findings: z.array(findingSchema).min(1).max(500),
    diagnostics: z.array(diagnosticSchema).max(100),
    reviewerNotes: z.array(reviewerNoteSchema).max(100),
    artifact: artifactSchema,
  })
  .strict()
  .superRefine((value, context) => {
    uniqueFindingIds(value, context);
    validateRawSemantics(value, context);
  });

export const policyDescriptorSchema = z
  .object({
    path: relativePathSchema,
    version: z.string().min(1).max(80),
    baseSha: shaSchema,
    sha256: sha256Schema,
  })
  .strict();

export const dispositionRecordSchema = z
  .object({
    findingId: findingIdSchema.nullable(),
    decision: z.enum(["accept-exception", "request-remediation", "reject", "invalid"]),
    actor: z.string().min(1).max(100),
    actorPermission: repositoryPermissionSchema,
    commentId: z
      .string()
      .min(1)
      .max(40)
      .regex(/^[1-9]\d*$/),
    commentUrl: boundedHttpUrlSchema,
    bodySha256: sha256Schema,
    rationale: z.string().min(1).max(1000).nullable(),
    expires: dateSchema.nullable(),
    recordedAt: timestampSchema,
    boundHeadSha: shaSchema.nullable(),
    status: z.enum([
      "accepted",
      "remediation-requested",
      "rejected",
      "superseded",
      "malformed",
      "stale",
      "expired",
      "unauthorized",
      "ineligible",
      "edited-away",
      "deleted",
    ]),
    effective: z.boolean(),
    errors: z.array(z.string().min(1).max(300)).max(20),
  })
  .strict();

export const gateCountsSchema = z
  .object({
    pass: z.number().int().nonnegative(),
    fail: z.number().int().nonnegative(),
    unknown: z.number().int().nonnegative(),
    exception: z.number().int().nonnegative(),
  })
  .strict();

export const gateSchema = z
  .object({
    conclusion: z.enum(["success", "failure"]),
    unresolvedFindingIds: z.array(findingIdSchema).max(500),
    counts: gateCountsSchema,
    evaluatedAt: timestampSchema,
    validUntil: timestampSchema.nullable(),
  })
  .strict();

export const finalEvidenceSchema = z
  .object({
    ...evidenceIdentityShape,
    documentType: z.literal("final"),
    generatedAt: timestampSchema,
    generatorVersion: z.string().min(1).max(80),
    origin: originSchema,
    policy: policyDescriptorSchema,
    tools: toolsSchema,
    findings: z.array(findingSchema).min(1).max(500),
    diagnostics: z.array(diagnosticSchema).max(100),
    dispositions: z.array(dispositionRecordSchema).max(1000),
    reviewerNotes: z.array(reviewerNoteSchema).max(100),
    gate: gateSchema,
    artifact: artifactSchema,
  })
  .strict()
  .superRefine((value, context) => {
    uniqueFindingIds(value, context);
    validateRawSemantics(value, context);
    if (value.policy.baseSha !== value.baseSha) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["policy", "baseSha"],
        message: "Policy baseSha must equal the evidence baseSha.",
      });
    }
    const findingIds = new Set(value.findings.map((finding) => finding.id));
    const reviewerFragmentDigests = new Set<string>();
    value.reviewerNotes.forEach((note, index) => {
      const unknownFindingId = note.findingIds.find((id) => !findingIds.has(id));
      if (unknownFindingId !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reviewerNotes", index, "findingIds"],
          message: `Reviewer note references unknown finding ${unknownFindingId}.`,
        });
      }
      if (reviewerFragmentDigests.has(note.fragmentSha256)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reviewerNotes", index, "fragmentSha256"],
          message: "Reviewer fragment digests must be unique.",
        });
      }
      reviewerFragmentDigests.add(note.fragmentSha256);
    });
    const unresolvedIds = new Set<string>();
    value.gate.unresolvedFindingIds.forEach((id, index) => {
      if (!findingIds.has(id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gate", "unresolvedFindingIds", index],
          message: "Gate references an unknown finding ID.",
        });
      }
      if (unresolvedIds.has(id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gate", "unresolvedFindingIds", index],
          message: "Gate unresolved finding IDs must be unique.",
        });
      }
      unresolvedIds.add(id);
    });
    const expectedCounts = {
      pass: 0,
      fail: 0,
      unknown: 0,
      exception: 0,
    };
    for (const finding of value.findings) {
      expectedCounts[finding.state] += 1;
    }
    for (const state of FINDING_STATES) {
      if (value.gate.counts[state] !== expectedCounts[state]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gate", "counts", state],
          message: "Gate count does not match the findings.",
        });
      }
    }
    const commentIds = new Set<string>();
    const effectiveFindings = new Set<string>();
    value.dispositions.forEach((disposition, index) => {
      if (commentIds.has(disposition.commentId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dispositions", index, "commentId"],
          message: "Disposition comment IDs must be unique.",
        });
      }
      commentIds.add(disposition.commentId);
      if (!disposition.effective) {
        return;
      }
      if (disposition.findingId === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dispositions", index, "findingId"],
          message: "An effective disposition must identify a finding.",
        });
        return;
      }
      if (effectiveFindings.has(disposition.findingId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dispositions", index, "effective"],
          message: "Only one disposition per finding may be effective.",
        });
      }
      effectiveFindings.add(disposition.findingId);
      if (!findingIds.has(disposition.findingId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dispositions", index, "findingId"],
          message: "Effective disposition references an unknown finding.",
        });
      }
      if (disposition.boundHeadSha !== value.headSha || disposition.rationale === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dispositions", index],
          message: "Effective disposition must be rationale- and head-SHA-bound.",
        });
      }
      if (
        disposition.decision === "accept-exception" &&
        (disposition.expires === null ||
          `${disposition.expires}T23:59:59.999Z` < value.gate.evaluatedAt)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dispositions", index, "expires"],
          message: "An effective exception must have a current expiry.",
        });
      }
      const expectedStatus =
        disposition.decision === "accept-exception"
          ? "accepted"
          : disposition.decision === "request-remediation"
            ? "remediation-requested"
            : disposition.decision === "reject"
              ? "rejected"
              : null;
      if (expectedStatus === null || disposition.status !== expectedStatus) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dispositions", index, "status"],
          message: "Effective disposition status does not match its decision.",
        });
      }
    });
    const accepted = new Set(
      value.dispositions.flatMap((disposition) =>
        disposition.effective &&
        disposition.status === "accepted" &&
        disposition.decision === "accept-exception" &&
        disposition.findingId !== null &&
        disposition.boundHeadSha === value.headSha &&
        disposition.expires !== null &&
        `${disposition.expires}T23:59:59.999Z` >= value.gate.evaluatedAt
          ? [disposition.findingId]
          : [],
      ),
    );
    const forcedBlockers = new Set(
      value.dispositions.flatMap((disposition) =>
        disposition.effective &&
        disposition.findingId !== null &&
        disposition.decision !== "accept-exception"
          ? [disposition.findingId]
          : [],
      ),
    );
    const expectedValidUntil =
      value.dispositions
        .flatMap((disposition) =>
          disposition.effective &&
          disposition.status === "accepted" &&
          disposition.decision === "accept-exception" &&
          disposition.expires !== null
            ? [`${disposition.expires}T23:59:59.999Z`]
            : [],
        )
        .sort()[0] ?? null;
    if (value.gate.validUntil !== expectedValidUntil) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gate", "validUntil"],
        message: "Gate validity horizon does not match effective exceptions.",
      });
    }
    const expectedUnresolved = value.findings
      .filter(
        (finding) =>
          forcedBlockers.has(finding.id) ||
          (finding.state !== "pass" &&
            !(finding.state === "exception" && accepted.has(finding.id))),
      )
      .map((finding) => finding.id)
      .sort();
    const actualUnresolved = [...value.gate.unresolvedFindingIds].sort();
    if (expectedUnresolved.join("\n") !== actualUnresolved.join("\n")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gate", "unresolvedFindingIds"],
        message: "Gate unresolved IDs do not match findings and dispositions.",
      });
    }
    const expectedConclusion = expectedUnresolved.length === 0 ? "success" : "failure";
    if (value.gate.conclusion !== expectedConclusion) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gate", "conclusion"],
        message: "Gate conclusion does not match unresolved findings.",
      });
    }
  });

export const reviewFragmentSchema = z
  .object({
    ...evidenceIdentityShape,
    documentType: z.literal("review-fragment"),
    policySha256: sha256Schema,
    evidenceArtifactSha256: sha256Schema,
    reviewerNote: reviewerNoteInputSchema,
    artifact: artifactSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.baseSha === value.headSha) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["headSha"],
        message: "baseSha and headSha must identify different commits.",
      });
    }
    if (value.reviewerNote.sourceSha !== value.headSha) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewerNote", "sourceSha"],
        message: "Reviewer note sourceSha must equal the fragment headSha.",
      });
    }
  });

export const evidenceDocumentSchema = z.union([
  rawEvidenceSchema,
  finalEvidenceSchema,
  reviewFragmentSchema,
]);

export type EvidenceReference = z.infer<typeof evidenceReferenceSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type Origin = z.infer<typeof originSchema>;
export type ToolVersions = z.infer<typeof toolsSchema>;
export type Diagnostic = z.infer<typeof diagnosticSchema>;
export type ReviewerNoteInput = z.infer<typeof reviewerNoteInputSchema>;
export type ReviewerNote = z.infer<typeof reviewerNoteSchema>;
export type Artifact = z.infer<typeof artifactSchema>;
export type RawEvidence = z.infer<typeof rawEvidenceSchema>;
export type PolicyDescriptor = z.infer<typeof policyDescriptorSchema>;
export type DispositionRecord = z.infer<typeof dispositionRecordSchema>;
export type Gate = z.infer<typeof gateSchema>;
export type FinalEvidence = z.infer<typeof finalEvidenceSchema>;
export type ReviewFragment = z.infer<typeof reviewFragmentSchema>;
export type EvidenceDocument = z.infer<typeof evidenceDocumentSchema>;

function parseWithSchema<T>(schema: z.ZodType<T>, input: unknown, code: string, label: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AgentProofError(
      code,
      `${label} validation failed.`,
      formatZodIssues(result.error.issues),
    );
  }
  return result.data;
}

export function parseRawEvidence(input: unknown): RawEvidence {
  return parseWithSchema(rawEvidenceSchema, input, "AP_RAW_EVIDENCE_INVALID", "Raw evidence");
}

export function parseFinalEvidence(input: unknown): FinalEvidence {
  return parseWithSchema(finalEvidenceSchema, input, "AP_FINAL_EVIDENCE_INVALID", "Final evidence");
}

export function parseReviewFragment(input: unknown): ReviewFragment {
  return parseWithSchema(
    reviewFragmentSchema,
    input,
    "AP_REVIEW_FRAGMENT_INVALID",
    "Review fragment",
  );
}

export function parseEvidenceDocument(input: unknown): EvidenceDocument {
  return parseWithSchema(evidenceDocumentSchema, input, "AP_EVIDENCE_INVALID", "Evidence document");
}
