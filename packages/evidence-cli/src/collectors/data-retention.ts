import {
  EVIDENCE_SCHEMA_VERSION,
  FINDING_IDS,
  sha256,
  type Finding,
} from "@agentproof/evidence-core";
import { parseDocument } from "yaml";
import { z } from "zod";

import { collectorDiagnostic, type CollectorResult, type TextCollectorSource } from "./types.js";

const scalarSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(200)).max(50),
]);
const declarationSchema = z
  .record(
    z
      .string()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z][A-Za-z0-9]*$/),
    scalarSchema,
  )
  .superRefine((value, context) => {
    if (Object.keys(value).length > 30) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Retention declaration has too many fields.",
      });
    }
    const valueNodes = Object.values(value).reduce<number>(
      (count, field) => count + (Array.isArray(field) ? field.length : 1),
      0,
    );
    if (valueNodes > 400) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Retention declaration contains too many values.",
      });
    }
  });

const BASE_FIELDS = [
  "schemaVersion",
  "classification",
  "retentionDays",
  "deletionMethod",
  "owner",
] as const;

function baseFinding(sourceSha: string, source: TextCollectorSource): Finding {
  return {
    id: FINDING_IDS.dataRetention,
    category: "policy",
    state: "unknown",
    severity: "moderate",
    title: "Data-retention declaration is complete",
    summary: "Data-retention declaration is unavailable.",
    evidenceRefs:
      source.path === null && source.content === null
        ? []
        : [
            {
              kind: "file",
              name: "Data-retention declaration",
              ...(source.path === null ? {} : { path: source.path }),
              ...(source.content === null ? {} : { sha256: sha256(source.content) }),
            },
          ],
    exceptionable: true,
    remediationHint: "Add every required data-retention field.",
    collector: "data-retention",
    sourceSha,
    facts: {},
  };
}

export interface DataRetentionCollectorInput {
  readonly sourceSha: string;
  readonly declaration: TextCollectorSource;
}

export function collectDataRetention(input: DataRetentionCollectorInput): CollectorResult {
  const finding = baseFinding(input.sourceSha, input.declaration);
  if (input.declaration.content === null) {
    finding.summary = "Data-retention declaration could not be read.";
    return {
      findings: [finding],
      diagnostics: [
        collectorDiagnostic(
          "data-retention",
          "AP_RETENTION_FILE_ERROR",
          input.declaration.error ?? "Data-retention declaration is absent.",
        ),
      ],
    };
  }

  let declaration: z.infer<typeof declarationSchema>;
  try {
    const document = parseDocument(input.declaration.content, {
      prettyErrors: false,
      strict: true,
      uniqueKeys: true,
    });
    if (document.errors.length > 0) {
      throw new Error("YAML parsing failed.");
    }
    declaration = declarationSchema.parse(document.toJS({ maxAliasCount: 0 }));
  } catch {
    finding.summary = "Data-retention YAML is malformed.";
    return {
      findings: [finding],
      diagnostics: [
        collectorDiagnostic(
          "data-retention",
          "AP_RETENTION_DECLARATION_INVALID",
          "Data-retention YAML validation failed.",
        ),
      ],
    };
  }

  const missing = BASE_FIELDS.filter((field) => {
    const value = declaration[field];
    return value === undefined || (typeof value === "string" && value.trim().length === 0);
  });
  const invalidVersion = declaration.schemaVersion !== EVIDENCE_SCHEMA_VERSION;
  const invalidRetention =
    !Number.isInteger(declaration.retentionDays) ||
    (typeof declaration.retentionDays === "number" && declaration.retentionDays <= 0);
  const invalidTextFields = [
    declaration.classification,
    declaration.deletionMethod,
    declaration.owner,
  ].some((value) => typeof value !== "string" || value.trim().length === 0);
  finding.facts = {
    declaration: declaration,
    missingFields: missing,
    schemaVersionValid: !invalidVersion,
  };
  if (missing.length > 0 || invalidVersion || invalidRetention || invalidTextFields) {
    finding.state = "unknown";
    finding.summary =
      missing.length > 0
        ? `Data-retention declaration is missing: ${missing.join(", ")}.`
        : invalidVersion
          ? "Data-retention declaration uses an unsupported schema version."
          : invalidRetention
            ? "Data-retention declaration has an invalid retentionDays value."
            : "Data-retention declaration has invalid baseline text fields.";
  } else {
    finding.state = "pass";
    finding.summary = "Data-retention declaration contains every baseline field.";
  }
  return { findings: [finding], diagnostics: [] };
}
