import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FINDING_IDS,
  ZERO_SHA256,
  createReviewFragment,
  parseFinalEvidence,
  parseRawEvidence,
  type RawEvidence,
} from "@agentproof/evidence-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runCli } from "../src/cli.js";
import { analyzeCommand } from "../src/commands/analyze.js";
import { assembleCommand } from "../src/commands/assemble.js";
import { evaluateCommand } from "../src/commands/evaluate.js";

const fixtureRoot = fileURLToPath(new URL("fixtures/", import.meta.url));
const workRoot = fileURLToPath(new URL("../.test-work/", import.meta.url));
const policyPath = fileURLToPath(new URL("../../../policy/release-policy.yml", import.meta.url));

function fixturePath(path: string): string {
  return fileURLToPath(new URL(`fixtures/${path}`, import.meta.url));
}

function workPath(path: string): string {
  return fileURLToPath(new URL(`../.test-work/${path}`, import.meta.url));
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function analyzeScenario(name: string): Promise<RawEvidence> {
  return analyzeCommand({
    workspacePath: fixtureRoot,
    metadataPath: fixturePath(`metadata/${name}.json`),
    outputPath: workPath(`${name}-raw.json`),
  });
}

async function evaluateScenario(name: string, dispositions: string) {
  const rawPath = workPath(`${name}-raw.json`);
  if (
    await readFile(rawPath, "utf8").then(
      () => false,
      () => true,
    )
  ) {
    await analyzeScenario(name);
  }
  return evaluateCommand({
    evidencePath: rawPath,
    policyPath,
    dispositionsPath: fixturePath(`dispositions/${dispositions}.json`),
    outputPath: workPath(`${name}-${dispositions}-final.json`),
  });
}

describe.sequential("CLI integration", () => {
  beforeAll(async () => {
    await rm(workRoot, { recursive: true, force: true });
    await mkdir(workRoot, { recursive: true });
  });

  afterAll(async () => {
    await rm(workRoot, { recursive: true, force: true });
  });

  it("analyzes and evaluates a green fixture", async () => {
    const raw = await analyzeScenario("green");
    expect(raw.findings).toHaveLength(5);
    expect(raw.diagnostics).toEqual([]);
    expect(raw.artifact.sha256).not.toBe(ZERO_SHA256);
    expect(parseRawEvidence(await readJson(workPath("green-raw.json")))).toEqual(raw);

    const final = await evaluateScenario("green", "empty");
    expect(final.gate.conclusion).toBe("success");
    expect(parseFinalEvidence(await readJson(workPath("green-empty-final.json")))).toEqual(final);
  });

  it("fails closed for failing, missing, and below-threshold evidence", async () => {
    const raw = await analyzeScenario("failure");
    const final = await evaluateScenario("failure", "empty");
    expect(final.gate.conclusion).toBe("failure");
    expect(final.gate.unresolvedFindingIds).toEqual(
      expect.arrayContaining([
        FINDING_IDS.authorizationTest,
        FINDING_IDS.testCoverage,
        FINDING_IDS.npmAudit,
        FINDING_IDS.dataRetention,
      ]),
    );
    expect(raw.findings.find((finding) => finding.id === FINDING_IDS.dataRetention)?.state).toBe(
      "unknown",
    );
  });

  it("records a valid accepted exception for the exact SHA", async () => {
    const final = await evaluateScenario("unknown", "accepted");
    expect(final.findings.find((finding) => finding.id === FINDING_IDS.dataRetention)?.state).toBe(
      "exception",
    );
    expect(final.dispositions[0]?.status).toBe("accepted");
    expect(final.gate.conclusion).toBe("success");
    expect(final.gate.unresolvedFindingIds).not.toContain(FINDING_IDS.dataRetention);
  });

  it.each([
    ["stale-sha", "stale"],
    ["expired", "expired"],
    ["unauthorized", "unauthorized"],
  ] as const)("keeps %s exceptions blocking", async (fixture, status) => {
    const final = await evaluateScenario("unknown", fixture);
    expect(final.dispositions[0]?.status).toBe(status);
    expect(final.gate.unresolvedFindingIds).toContain(FINDING_IDS.dataRetention);
  });

  it("turns collector process and parsing errors into blocking evidence", async () => {
    const raw = await analyzeScenario("collector-error");
    expect(raw.diagnostics.length).toBeGreaterThanOrEqual(4);
    expect(raw.findings.every((finding) => finding.state === "unknown")).toBe(true);
    const final = await evaluateScenario("collector-error", "empty");
    expect(final.gate.conclusion).toBe("failure");
  });

  it("writes explicit unknown evidence when collector orchestration fails", async () => {
    const outputPath = workPath("orchestration-error-raw.json");
    const raw = await analyzeCommand({
      workspacePath: workPath("missing-workspace"),
      metadataPath: fixturePath("metadata/workflow.json"),
      outputPath,
    });
    expect(raw.findings).toHaveLength(5);
    expect(raw.findings.every((finding) => finding.state === "unknown")).toBe(true);
    expect(raw.diagnostics).toEqual([
      expect.objectContaining({ code: "AP_ANALYZE_COLLECTOR_ERROR" }),
    ]);
    expect(parseRawEvidence(await readJson(outputPath))).toEqual(raw);
  });

  it("rejects a tampered producer artifact", async () => {
    const raw = await analyzeScenario("green");
    const tampered = structuredClone(raw);
    tampered.findings[0]!.summary = "tampered after analysis";
    const path = workPath("tampered-raw.json");
    await writeJson(path, tampered);
    await expect(
      evaluateCommand({
        evidencePath: path,
        policyPath,
        dispositionsPath: fixturePath("dispositions/empty.json"),
        outputPath: workPath("tampered-final.json"),
      }),
    ).rejects.toThrow(/does not match/);
  });

  it("uses tampered and mixed-SHA artifact fixtures fail closed", async () => {
    await expect(
      assembleCommand({
        fragmentPaths: [
          fixturePath("artifacts/tampered-final.json"),
          fixturePath("artifacts/review-fragment.json"),
        ],
        outputPath: workPath("tampered-assembly.json"),
      }),
    ).rejects.toThrow(/does not match/);
    await expect(
      assembleCommand({
        fragmentPaths: [
          fixturePath("artifacts/final.json"),
          fixturePath("artifacts/mixed-sha-fragment.json"),
        ],
        outputPath: workPath("mixed-sha-assembly.json"),
      }),
    ).rejects.toThrow(/exactly one evidence identity/);
  });

  it("assembles same-SHA notes and rejects mixed artifacts", async () => {
    const final = await evaluateScenario("green", "empty");
    const fragment = createReviewFragment({
      repository: final.repository,
      pullRequestNumber: final.pullRequestNumber,
      baseSha: final.baseSha,
      headSha: final.headSha,
      policySha256: final.policy.sha256,
      evidenceArtifactSha256: final.artifact.sha256,
      reviewerNote: {
        specialist: "test",
        sessionUrl: "https://github.com/copilot/agents/session/test",
        sourceSha: final.headSha,
        summary: "Test evidence is consistent with the normalized report.",
        findingIds: [FINDING_IDS.testSuite, FINDING_IDS.authorizationTest],
        createdAt: "2026-09-02T08:40:00.000Z",
      },
    });
    const finalPath = workPath("assemble-final.json");
    const fragmentPath = workPath("review-fragment.json");
    await writeJson(finalPath, final);
    await writeJson(fragmentPath, fragment);
    const assembled = await assembleCommand({
      fragmentPaths: [fragmentPath, finalPath],
      outputPath: workPath("assembled.json"),
    });
    expect(assembled.reviewerNotes).toHaveLength(1);

    const mixed = structuredClone(fragment);
    mixed.evidenceArtifactSha256 = "a".repeat(64);
    mixed.artifact.sha256 = ZERO_SHA256;
    const mixedPath = workPath("mixed-fragment.json");
    await writeJson(mixedPath, mixed);
    await expect(
      assembleCommand({
        fragmentPaths: [finalPath, mixedPath],
        outputPath: workPath("mixed-output.json"),
      }),
    ).rejects.toThrow();
  });

  it("uses exit code 2 for a completed blocking evaluation", async () => {
    await analyzeScenario("failure");
    const stdout: string[] = [];
    const stderr: string[] = [];
    const code = await runCli(
      [
        "evaluate",
        "--evidence",
        workPath("failure-raw.json"),
        "--policy",
        policyPath,
        "--dispositions",
        fixturePath("dispositions/empty.json"),
        "--output",
        workPath("run-cli-final.json"),
      ],
      {
        stdout: (value) => stdout.push(value),
        stderr: (value) => stderr.push(value),
      },
    );
    expect(code).toBe(2);
    expect(stderr).toEqual([]);
    expect(JSON.parse(stdout.join("")) as unknown).toMatchObject({
      command: "evaluate",
      conclusion: "failure",
    });
  });
});
