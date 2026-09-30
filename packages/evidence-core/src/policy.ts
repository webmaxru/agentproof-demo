import { parseDocument } from "yaml";
import { z } from "zod";

import {
  FINDING_IDS,
  FINDING_STATES,
  POLICY_SCHEMA_VERSION,
  REPOSITORY_PERMISSIONS,
  SEVERITIES,
} from "./constants.js";
import { AgentProofError, formatZodIssues } from "./errors.js";
import { findingIdSchema, severitySchema } from "./evidence-schema.js";

const relativePolicyPathSchema = z
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

const findingPolicySchema = z
  .object({
    findingId: findingIdSchema,
    title: z.string().min(1).max(120),
    severity: severitySchema,
    exceptionable: z.boolean(),
    remediationHint: z.string().min(1).max(500),
  })
  .strict();

const percentageSchema = z.number().finite().min(0).max(100);

export const releasePolicySchema = z
  .object({
    schemaVersion: z.literal(POLICY_SCHEMA_VERSION),
    id: z
      .string()
      .min(3)
      .max(100)
      .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
    version: z
      .string()
      .max(80)
      .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, "Expected SemVer."),
    path: relativePolicyPathSchema,
    rules: z
      .object({
        tests: z
          .object({
            suite: findingPolicySchema,
            requiredTests: z
              .array(
                findingPolicySchema
                  .extend({
                    testId: z
                      .string()
                      .min(3)
                      .max(80)
                      .regex(/^[a-z0-9][a-z0-9._:-]+$/),
                  })
                  .strict(),
              )
              .max(50),
            coverage: findingPolicySchema
              .extend({
                minimum: z
                  .object({
                    lines: percentageSchema,
                    functions: percentageSchema,
                    branches: percentageSchema,
                    statements: percentageSchema,
                  })
                  .strict(),
              })
              .strict(),
          })
          .strict(),
        dependencies: findingPolicySchema
          .extend({
            maximumAllowedSeverity: z.enum(SEVERITIES),
          })
          .strict(),
        dataRetention: findingPolicySchema
          .extend({
            requiredFields: z
              .array(
                z
                  .string()
                  .min(1)
                  .max(80)
                  .regex(/^[A-Za-z][A-Za-z0-9]*$/),
              )
              .min(1)
              .max(30),
            maximumDays: z.number().int().positive().max(3650),
          })
          .strict(),
        provenance: findingPolicySchema
          .extend({
            requireDeclaration: z.boolean(),
          })
          .strict(),
      })
      .strict(),
    exceptions: z
      .object({
        authorizedMinimumPermission: z.enum(REPOSITORY_PERMISSIONS),
        minimumRationaleLength: z.number().int().min(10).max(500),
        maximumDurationDays: z.number().int().positive().max(365),
        allowedFindingStates: z.array(z.enum(FINDING_STATES)).min(1).max(FINDING_STATES.length),
        maximumSeverity: z.enum(SEVERITIES),
      })
      .strict(),
  })
  .strict()
  .superRefine((policy, context) => {
    const findingIds = [
      policy.rules.tests.suite.findingId,
      policy.rules.tests.coverage.findingId,
      ...policy.rules.tests.requiredTests.map((rule) => rule.findingId),
      policy.rules.dependencies.findingId,
      policy.rules.dataRetention.findingId,
      policy.rules.provenance.findingId,
    ];
    if (new Set(findingIds).size !== findingIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rules"],
        message: "Every policy rule must use a unique findingId.",
      });
    }
    if (findingIds.includes(FINDING_IDS.collectorIntegrity)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rules"],
        message: `${FINDING_IDS.collectorIntegrity} is reserved by the evaluator.`,
      });
    }

    const requiredTestIds = policy.rules.tests.requiredTests.map((rule) => rule.testId);
    if (new Set(requiredTestIds).size !== requiredTestIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rules", "tests", "requiredTests"],
        message: "Every required test must use a unique testId.",
      });
    }

    const requiredFields = policy.rules.dataRetention.requiredFields;
    if (new Set(requiredFields).size !== requiredFields.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rules", "dataRetention", "requiredFields"],
        message: "Data-retention requiredFields must be unique.",
      });
    }

    const allowedStates = policy.exceptions.allowedFindingStates;
    if (new Set(allowedStates).size !== allowedStates.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["exceptions", "allowedFindingStates"],
        message: "Exception allowedFindingStates must be unique.",
      });
    }
  });

export type ReleasePolicy = z.infer<typeof releasePolicySchema>;
export type FindingPolicy = z.infer<typeof findingPolicySchema>;

export function parseReleasePolicy(input: unknown): ReleasePolicy {
  const result = releasePolicySchema.safeParse(input);
  if (!result.success) {
    throw new AgentProofError(
      "AP_POLICY_INVALID",
      "Release policy validation failed.",
      formatZodIssues(result.error.issues),
    );
  }
  return result.data;
}

export function loadReleasePolicyYaml(source: string): ReleasePolicy {
  if (Buffer.byteLength(source, "utf8") > 256 * 1024) {
    throw new AgentProofError(
      "AP_POLICY_TOO_LARGE",
      "Release policy exceeds the 256 KiB input limit.",
    );
  }
  if (source.includes("\0")) {
    throw new AgentProofError("AP_POLICY_INVALID", "Release policy contains a NUL character.");
  }

  let document: ReturnType<typeof parseDocument>;
  try {
    document = parseDocument(source, {
      prettyErrors: false,
      strict: true,
      uniqueKeys: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "YAML parse failed";
    throw new AgentProofError("AP_POLICY_YAML_INVALID", message);
  }

  if (document.errors.length > 0) {
    throw new AgentProofError(
      "AP_POLICY_YAML_INVALID",
      "Release policy YAML parsing failed.",
      document.errors.map((error) => error.message),
    );
  }

  let value: unknown;
  try {
    value = document.toJS({ maxAliasCount: 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "YAML conversion failed";
    throw new AgentProofError("AP_POLICY_YAML_INVALID", message);
  }
  return parseReleasePolicy(value);
}
