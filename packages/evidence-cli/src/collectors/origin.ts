import {
  FINDING_IDS,
  boundedHttpUrlSchema,
  sha256,
  type Finding,
  type Origin,
} from "@agentproof/evidence-core";
import { z } from "zod";

import { collectorDiagnostic, type CollectorResult } from "./types.js";

export const ORIGIN_BLOCK_START = "<!-- agentproof-origin:start -->";
export const ORIGIN_BLOCK_END = "<!-- agentproof-origin:end -->";

export const originMetadataSchema = z
  .object({
    pullRequestBody: z.string().max(65_536).nullable(),
    githubAttribution: z
      .object({
        tool: z.string().trim().min(1).max(80),
        url: boundedHttpUrlSchema.nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export type OriginMetadata = z.infer<typeof originMetadataSchema>;

function makeFinding(
  sourceSha: string,
  origin: Origin,
  summary: string,
  url: string | null = null,
  sourceDigest: string | null = null,
): Finding {
  return {
    id: FINDING_IDS.origin,
    category: "provenance",
    state: origin.classification === "unknown" ? "unknown" : "pass",
    severity: "low",
    title: "AI-assistance origin is bounded",
    summary,
    evidenceRefs:
      url === null
        ? [
            {
              kind: "pull-request",
              name: "Pull request origin metadata",
              ...(sourceDigest === null ? {} : { sha256: sourceDigest }),
            },
          ]
        : [
            {
              kind: "pull-request",
              name: "GitHub origin attribution",
              url,
            },
          ],
    exceptionable: true,
    remediationHint: "Add one valid bounded AgentProof origin block.",
    collector: "origin",
    sourceSha,
    facts: {
      classification: origin.classification,
      declaredTool: origin.declaredTool,
    },
  };
}

export interface OriginCollectorResult extends CollectorResult {
  readonly origin: Origin;
}

function unknown(sourceSha: string, code: string, summary: string): OriginCollectorResult {
  const origin: Origin = {
    classification: "unknown",
    declaredTool: null,
    source: "none",
  };
  return {
    origin,
    findings: [makeFinding(sourceSha, origin, summary)],
    diagnostics: [collectorDiagnostic("origin", code, summary)],
  };
}

export function collectOrigin(sourceSha: string, metadataInput: unknown): OriginCollectorResult {
  const metadataResult = originMetadataSchema.safeParse(metadataInput);
  if (!metadataResult.success) {
    return unknown(sourceSha, "AP_ORIGIN_METADATA_INVALID", "PR origin metadata is malformed.");
  }
  const metadata = metadataResult.data;

  if (metadata.githubAttribution !== null) {
    const origin: Origin = {
      classification: "github-attributed",
      declaredTool: metadata.githubAttribution.tool.trim(),
      source: "github",
    };
    return {
      origin,
      findings: [
        makeFinding(
          sourceSha,
          origin,
          "GitHub-provided origin attribution is present.",
          metadata.githubAttribution.url,
        ),
      ],
      diagnostics: [],
    };
  }

  const body = metadata.pullRequestBody;
  if (body === null) {
    return unknown(sourceSha, "AP_ORIGIN_MISSING", "Pull request has no AgentProof origin block.");
  }
  let block: string;
  let toolPattern = /^tool: (.{1,80})$/u;
  if (body.includes(ORIGIN_BLOCK_START) || body.includes(ORIGIN_BLOCK_END)) {
    const startParts = body.split(ORIGIN_BLOCK_START);
    const endParts = body.split(ORIGIN_BLOCK_END);
    if (startParts.length !== 2 || endParts.length !== 2) {
      return unknown(
        sourceSha,
        "AP_ORIGIN_BLOCK_INVALID",
        "Pull request must contain exactly one complete AgentProof origin block.",
      );
    }
    const start = body.indexOf(ORIGIN_BLOCK_START) + ORIGIN_BLOCK_START.length;
    const end = body.indexOf(ORIGIN_BLOCK_END);
    if (end < start) {
      return unknown(
        sourceSha,
        "AP_ORIGIN_BLOCK_INVALID",
        "AgentProof origin block markers are out of order.",
      );
    }
    block = body.slice(start, end);
  } else {
    const headings = [...body.matchAll(/^## AI assistance origin\s*$/gimu)];
    if (headings.length !== 1) {
      return unknown(
        sourceSha,
        "AP_ORIGIN_BLOCK_INVALID",
        "Pull request must contain exactly one bounded AI assistance origin section.",
      );
    }
    const heading = headings[0];
    if (heading === undefined) {
      return unknown(
        sourceSha,
        "AP_ORIGIN_BLOCK_INVALID",
        "Pull request must contain exactly one bounded AI assistance origin section.",
      );
    }
    const start = (heading.index ?? 0) + (heading[0]?.length ?? 0);
    const remaining = body.slice(start);
    const nextHeading = /^##\s+/mu.exec(remaining);
    block = nextHeading?.index === undefined ? remaining : remaining.slice(0, nextHeading.index);
    toolPattern = /^- Classification: self-declared\n- Declared tool: (.{1,80})$/u;
  }
  if (Buffer.byteLength(block, "utf8") > 512) {
    return unknown(
      sourceSha,
      "AP_ORIGIN_BLOCK_TOO_LARGE",
      "AgentProof origin block exceeds 512 bytes.",
    );
  }
  const normalized = block
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .filter((line) => !/^<!--.*-->$/u.test(line.trim()))
    .join("\n")
    .trim();
  const match = toolPattern.exec(normalized);
  if (match === null) {
    return unknown(
      sourceSha,
      "AP_ORIGIN_BLOCK_INVALID",
      "Origin block must contain exactly one bounded tool line.",
    );
  }
  const tool = match[1]?.trim() ?? "";
  const containsControl = [...tool].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
  if (tool.length === 0 || tool.length > 80 || containsControl) {
    return unknown(sourceSha, "AP_ORIGIN_BLOCK_INVALID", "Origin tool cannot be blank.");
  }
  const origin: Origin = {
    classification: "self-declared",
    declaredTool: tool,
    source: "pull-request-body",
  };
  return {
    origin,
    findings: [
      makeFinding(
        sourceSha,
        origin,
        "A bounded self-declared origin is present.",
        null,
        sha256(body),
      ),
    ],
    diagnostics: [],
  };
}
