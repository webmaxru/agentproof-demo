import {
  EVIDENCE_SCHEMA_VERSION,
  AgentProofError,
  boundedHttpUrlSchema,
  formatZodIssues,
  repositorySchema,
  shaSchema,
  timestampSchema,
} from "@agentproof/evidence-core";
import { z } from "zod";

import { originMetadataSchema } from "./collectors/origin.js";

export const commandExecutionSchema = z
  .object({
    exitCode: z.number().int().min(0).max(255).nullable(),
    error: z.string().min(1).max(500).nullable(),
  })
  .strict();

const repositoryRelativePathSchema = z
  .string()
  .min(1)
  .max(300)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.startsWith("\\") &&
      !/^[A-Za-z]:/u.test(value) &&
      !value.includes("\0") &&
      !value.split(/[\\/]/u).includes(".."),
    "Expected a repository-relative path.",
  );
const sourcePathSchema = repositoryRelativePathSchema.nullable();

export const reportAnalyzeMetadataSchema = z
  .object({
    schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
    repository: repositorySchema,
    pullRequestNumber: z.number().int().positive(),
    baseSha: shaSchema,
    headSha: shaSchema,
    generatedAt: timestampSchema,
    workflowRunUrl: boundedHttpUrlSchema.nullable(),
    origin: originMetadataSchema,
    tools: z
      .object({
        npmVersion: z.string().min(1).max(80).nullable(),
        vitestVersion: z.string().min(1).max(80).nullable(),
        auditDatabaseUpdatedAt: timestampSchema.nullable(),
      })
      .strict(),
    sources: z
      .object({
        vitest: z
          .object({
            reportPath: sourcePathSchema,
            coveragePath: sourcePathSchema,
            command: commandExecutionSchema,
          })
          .strict(),
        npmAudit: z
          .object({
            reportPath: sourcePathSchema,
            command: commandExecutionSchema,
          })
          .strict(),
        dataRetention: z
          .object({
            declarationPath: sourcePathSchema,
          })
          .strict(),
      })
      .strict(),
  })
  .strict()
  .superRefine((metadata, context) => {
    if (metadata.baseSha === metadata.headSha) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["headSha"],
        message: "baseSha and headSha must identify different commits.",
      });
    }
  });

export type CommandExecutionMetadata = z.infer<typeof commandExecutionSchema>;
export type ReportAnalyzeMetadata = z.infer<typeof reportAnalyzeMetadataSchema>;

export const pullRequestAnalyzeMetadataSchema = z
  .object({
    schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
    repository: repositorySchema,
    pullRequestNumber: z.number().int().positive(),
    pullRequestUrl: boundedHttpUrlSchema.optional(),
    pullRequestBody: z.string().max(50_000).default(""),
    author: z.string().min(1).max(100).optional(),
    authorAssociation: z.string().min(1).max(30).optional(),
    baseRef: z.string().min(1).max(255).optional(),
    baseSha: shaSchema,
    headRef: z.string().min(1).max(255).optional(),
    headSha: shaSchema,
    appPath: repositoryRelativePathSchema.optional(),
    samplePath: repositoryRelativePathSchema.optional(),
  })
  .strict()
  .superRefine((metadata, context) => {
    if (metadata.baseSha === metadata.headSha) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["headSha"],
        message: "baseSha and headSha must identify different commits.",
      });
    }
    if (
      metadata.appPath !== undefined &&
      metadata.samplePath !== undefined &&
      metadata.appPath !== metadata.samplePath
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appPath"],
        message: "appPath and the legacy samplePath alias must agree.",
      });
    }
  })
  .transform(({ appPath, samplePath, ...metadata }) => ({
    ...metadata,
    appPath: appPath ?? samplePath ?? ".",
  }));

export type PullRequestAnalyzeMetadata = z.infer<typeof pullRequestAnalyzeMetadataSchema>;
export type AnalyzeMetadata = ReportAnalyzeMetadata | PullRequestAnalyzeMetadata;

export function isReportAnalyzeMetadata(
  metadata: AnalyzeMetadata,
): metadata is ReportAnalyzeMetadata {
  return "sources" in metadata;
}

export function parseAnalyzeMetadata(input: unknown): AnalyzeMetadata {
  const result = z
    .union([reportAnalyzeMetadataSchema, pullRequestAnalyzeMetadataSchema])
    .safeParse(input);
  if (!result.success) {
    throw new AgentProofError(
      "AP_ANALYZE_METADATA_INVALID",
      "Analyze metadata validation failed.",
      formatZodIssues(result.error.issues),
    );
  }
  return result.data;
}
