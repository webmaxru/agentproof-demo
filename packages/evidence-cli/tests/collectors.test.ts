import { readFileSync } from "node:fs";

import { FINDING_IDS } from "@agentproof/evidence-core";
import { describe, expect, it } from "vitest";

import { collectDataRetention } from "../src/collectors/data-retention.js";
import { collectNpmAudit } from "../src/collectors/npm-audit.js";
import { ORIGIN_BLOCK_END, ORIGIN_BLOCK_START, collectOrigin } from "../src/collectors/origin.js";
import { collectVitest } from "../src/collectors/vitest.js";

const HEAD_SHA = "2".repeat(40);

function fixture(path: string): string {
  return readFileSync(new URL(`fixtures/${path}`, import.meta.url), "utf8");
}

function source(path: string, content = fixture(path)) {
  return { path, content, error: null };
}

describe("Vitest collector", () => {
  it("normalizes passing tests, stable IDs, and coverage", () => {
    const result = collectVitest({
      sourceSha: HEAD_SHA,
      report: source("vitest/green.json"),
      coverage: source("coverage/green.json"),
      command: { exitCode: 0, error: null },
    });
    expect(result.findings.map((finding) => finding.state)).toEqual(["pass", "pass"]);
    expect(result.findings[0]?.facts.testCases).toEqual([
      expect.objectContaining({
        id: "expense-approval.authorization.non-approver-denied",
        status: "passed",
      }),
    ]);
  });

  it("emits fail for a real test failure", () => {
    const result = collectVitest({
      sourceSha: HEAD_SHA,
      report: source("vitest/failure.json"),
      coverage: source("coverage/green.json"),
      command: { exitCode: 1, error: null },
    });
    expect(result.findings[0]?.state).toBe("fail");
  });

  it("emits unknown, never pass, for malformed output or tool failure", () => {
    const malformed = collectVitest({
      sourceSha: HEAD_SHA,
      report: source("vitest/malformed.json"),
      coverage: { path: "coverage/missing.json", content: null, error: "absent" },
      command: { exitCode: 0, error: null },
    });
    expect(malformed.findings.every((finding) => finding.state === "unknown")).toBe(true);

    const failed = collectVitest({
      sourceSha: HEAD_SHA,
      report: source("vitest/green.json"),
      coverage: source("coverage/green.json"),
      command: { exitCode: 2, error: "process failed" },
    });
    expect(failed.findings.every((finding) => finding.state === "unknown")).toBe(true);
    expect(failed.diagnostics).not.toHaveLength(0);

    const unexplainedExit = collectVitest({
      sourceSha: HEAD_SHA,
      report: source("vitest/green.json"),
      coverage: source("coverage/green.json"),
      command: { exitCode: 1, error: null },
    });
    expect(unexplainedExit.findings.every((finding) => finding.state === "unknown")).toBe(true);
  });
});

describe("npm audit collector", () => {
  it("distinguishes clean and vulnerable reports", () => {
    const clean = collectNpmAudit({
      sourceSha: HEAD_SHA,
      report: source("npm-audit/clean.json"),
      command: { exitCode: 0, error: null },
    });
    expect(clean.findings[0]).toMatchObject({
      id: FINDING_IDS.npmAudit,
      state: "pass",
    });

    const vulnerable = collectNpmAudit({
      sourceSha: HEAD_SHA,
      report: source("npm-audit/vulnerable.json"),
      command: { exitCode: 1, error: null },
    });
    expect(vulnerable.findings[0]?.state).toBe("fail");
    expect(vulnerable.findings[0]?.facts.advisoryIds).toEqual(["1099999"]);
  });

  it("turns malformed reports and registry failures into unknown", () => {
    const malformed = collectNpmAudit({
      sourceSha: HEAD_SHA,
      report: source("npm-audit/malformed.json"),
      command: { exitCode: 0, error: null },
    });
    expect(malformed.findings[0]?.state).toBe("unknown");

    const unavailable = collectNpmAudit({
      sourceSha: HEAD_SHA,
      report: source("npm-audit/clean.json"),
      command: { exitCode: 2, error: "registry unavailable" },
    });
    expect(unavailable.findings[0]?.state).toBe("unknown");
    expect(unavailable.diagnostics[0]?.code).toBe("AP_NPM_AUDIT_TOOL_ERROR");

    const mismatchedCounts = fixture("npm-audit/vulnerable.json")
      .replace('"moderate": 0', '"moderate": 1')
      .replace('"high": 1', '"high": 0');
    const inconsistent = collectNpmAudit({
      sourceSha: HEAD_SHA,
      report: source("npm-audit/vulnerable.json", mismatchedCounts),
      command: { exitCode: 0, error: null },
    });
    expect(inconsistent.findings[0]?.state).toBe("unknown");
  });
});

describe("data-retention and origin collectors", () => {
  it("accepts complete retention and marks incomplete retention unknown", () => {
    expect(
      collectDataRetention({
        sourceSha: HEAD_SHA,
        declaration: source("retention/complete.yml"),
      }).findings[0]?.state,
    ).toBe("pass");
    expect(
      collectDataRetention({
        sourceSha: HEAD_SHA,
        declaration: source("retention/incomplete.yml"),
      }).findings[0]?.state,
    ).toBe("unknown");
    expect(
      collectDataRetention({
        sourceSha: HEAD_SHA,
        declaration: source("retention/malformed.yml"),
      }).findings[0]?.state,
    ).toBe("unknown");
  });

  it("parses exactly one bounded self-declaration", () => {
    const result = collectOrigin(HEAD_SHA, {
      pullRequestBody: `${ORIGIN_BLOCK_START}\ntool: Claude Code\n${ORIGIN_BLOCK_END}`,
      githubAttribution: null,
    });
    expect(result.origin).toEqual({
      classification: "self-declared",
      declaredTool: "Claude Code",
      source: "pull-request-body",
    });
    expect(result.findings[0]?.state).toBe("pass");
  });

  it("parses the bounded pull request template section", () => {
    const result = collectOrigin(HEAD_SHA, {
      pullRequestBody: `## Change

Synthetic change.

## AI assistance origin

<!-- Keep exactly one classification. -->

- Classification: self-declared
- Declared tool: GitHub Copilot

## Validation

- Tests run`,
      githubAttribution: null,
    });
    expect(result.origin.classification).toBe("self-declared");
    expect(result.origin.declaredTool).toBe("GitHub Copilot");
  });

  it("does not infer origin from malformed or duplicate blocks", () => {
    const result = collectOrigin(HEAD_SHA, {
      pullRequestBody: `${ORIGIN_BLOCK_START}\ntool: A\n${ORIGIN_BLOCK_END}\n${ORIGIN_BLOCK_START}\ntool: B\n${ORIGIN_BLOCK_END}`,
      githubAttribution: null,
    });
    expect(result.origin.classification).toBe("unknown");
    expect(result.findings[0]?.state).toBe("unknown");
  });
});
