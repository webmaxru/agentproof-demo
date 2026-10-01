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
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { runCli } from "../src/cli.js";
import { analyzeCommand } from "../src/commands/analyze.js";
import { assembleCommand } from "../src/commands/assemble.js";
import { evaluateCommand } from "../src/commands/evaluate.js";
import { parseAnalyzeMetadata } from "../src/metadata.js";

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

async function publicationFixture(workflowSha: string) {
  const raw = await analyzeScenario("green");
  const metadata = parseAnalyzeMetadata(await readJson(fixturePath("metadata/workflow.json")));
  if ("sources" in metadata) throw new Error("Expected pull-request metadata");
  const prefix = `/repos/${raw.repository}`;
  const repository = { id: 100, full_name: raw.repository, default_branch: "main" };
  const workflow = {
    id: 200,
    name: "AgentProof Analysis",
    path: ".github/workflows/agentproof-analyze.yml",
    state: "active",
  };
  const state = {
    repository,
    reference: {
      ref: "refs/heads/main",
      url: `https://api.github.com${prefix}/git/refs/heads/main`,
      object: { type: "commit", sha: workflowSha },
    },
    pullRequest: {
      number: raw.pullRequestNumber,
      state: "open",
      html_url: metadata.pullRequestUrl,
      body: metadata.pullRequestBody,
      user: { login: metadata.author },
      author_association: metadata.authorAssociation,
      base: { ref: "main", sha: raw.baseSha, repo: repository },
      head: { ref: metadata.headRef, sha: raw.headSha },
    },
    analysisRun: {
      id: 1,
      run_attempt: 1,
      workflow_id: workflow.id,
      name: workflow.name,
      path: workflow.path,
      event: "workflow_dispatch",
      status: "completed",
      conclusion: "success",
      repository,
      head_repository: repository,
      head_branch: "main",
      head_sha: workflowSha,
      actor: { id: 41898282, login: "github-actions[bot]", type: "Bot" },
    },
  };
  const environment = {
    GITHUB_TOKEN: "test-token",
    GITHUB_REPOSITORY: raw.repository,
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_SERVER_URL: "https://github.com",
    GITHUB_RUN_ID: "2",
    GITHUB_OUTPUT: workPath("publish.output"),
    EVIDENCE_PATH: workPath("green-empty-final.json"),
    METADATA_PATH: workPath("publish-metadata.json"),
    RAW_EVIDENCE_PATH: workPath("green-raw.json"),
    EXPECTED_RUN_ID: "1",
    EXPECTED_RUN_ATTEMPT: "1",
    EXPECTED_WORKFLOW_SHA: workflowSha,
    EXPECTED_ARTIFACT_NAME: `agentproof-raw-pr-${raw.pullRequestNumber}-${raw.headSha}`,
  };
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  await writeJson(environment.METADATA_PATH, metadata);
  const evidence = await evaluateScenario("green", "empty");
  const writes: { path: string; body: unknown }[] = [];
  const reads: string[] = [];
  async function publish(beforeRequest?: (path: string) => void) {
    function responseForRequest(
      url: Parameters<typeof fetch>[0],
      options: Parameters<typeof fetch>[1],
    ) {
      const requestUrl = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      const path = requestUrl.replace("https://api.github.com", "");
      beforeRequest?.(path);
      if (options?.method !== "GET") {
        if (typeof options?.body !== "string") throw new Error("Expected a JSON request");
        const body: unknown = JSON.parse(options.body);
        writes.push({ path, body });
        if (path === `${prefix}/issues/${raw.pullRequestNumber}/comments`) {
          if (typeof body !== "object" || body === null || !("body" in body)) {
            throw new Error("Expected a comment body");
          }
          return Response.json({
            id: 700,
            body: body.body,
            user: { id: 41898282, login: "github-actions[bot]", type: "Bot" },
          });
        }
        if (path === `${prefix}/check-runs`) {
          return Response.json({
            id: 600,
            name: "AgentProof / gate",
            app: { id: 15368 },
            head_sha: raw.headSha,
            status: "completed",
            conclusion: "success",
          });
        }
        throw new Error(`Unexpected publication write: ${path}`);
      }
      reads.push(path);
      if (path === prefix) return Response.json(state.repository);
      if (path === `${prefix}/pulls/${raw.pullRequestNumber}`) {
        return Response.json(state.pullRequest);
      }
      if (path === `${prefix}/actions/runs/1`) return Response.json(state.analysisRun);
      if (path === `${prefix}/actions/workflows/agentproof-analyze.yml`) {
        return Response.json(workflow);
      }
      if (path === `${prefix}/git/ref/heads/${state.repository.default_branch}`) {
        return Response.json(state.reference);
      }
      if (path === `${prefix}/issues/${raw.pullRequestNumber}/comments?per_page=100&page=1`) {
        return Response.json([]);
      }
      if (path.startsWith(`${prefix}/commits/${raw.headSha}/check-runs?`)) {
        return Response.json({ check_runs: [] });
      }
      throw new Error(`Unexpected publication read: ${path}`);
    }
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((url, options) => Promise.resolve(responseForRequest(url, options))),
    );
    vi.resetModules();
    const script = fileURLToPath(
      new URL("../../../.github/scripts/publish-check.mjs", import.meta.url),
    );
    await import(script);
  }
  return { state, evidence, writes, reads, publish };
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

  it.each(["1111111111111111111111111111111111111111", "3333333333333333333333333333333333333333"])(
    "current publication code preserves policy-base evidence with workflow SHA %s",
    async (workflowSha) => {
      try {
        const fixture = await publicationFixture(workflowSha);
        await fixture.publish();
        expect(fixture.evidence.baseSha).toBe("1111111111111111111111111111111111111111");
        expect(fixture.evidence.policy.baseSha).toBe(fixture.evidence.baseSha);
        expect(fixture.evidence.gate.conclusion).toBe("success");
        expect(fixture.writes).toHaveLength(2);
        expect(fixture.writes[1]?.body).toMatchObject({
          head_sha: fixture.evidence.headSha,
          conclusion: "success",
        });
        expect(fixture.reads.filter((path) => path.endsWith("/actions/runs/1"))).toHaveLength(3);
        expect(fixture.reads.filter((path) => path.endsWith("/git/ref/heads/main"))).toHaveLength(
          3,
        );
      } finally {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
      }
    },
  );

  it.each([
    "attempt",
    "controller",
    "workflow",
    "default-ref",
    "default-tip",
    "head",
    "base",
    "body",
    "failure",
    "cancelled",
    "timed_out",
  ])("old-base publication blocks changed %s before each native write", async (change) => {
    for (const boundary of ["summary", "check"]) {
      try {
        const fixture = await publicationFixture("3333333333333333333333333333333333333333");
        await expect(
          fixture.publish((path) => {
            const boundaryReached =
              boundary === "summary"
                ? path.endsWith("/comments?per_page=100&page=1")
                : path.includes("/check-runs?");
            if (!boundaryReached) return;
            const { state } = fixture;
            if (change === "attempt") state.analysisRun.run_attempt += 1;
            else if (change === "controller") state.analysisRun.actor.login = "other-bot";
            else if (change === "workflow") state.analysisRun.head_sha = fixture.evidence.baseSha;
            else if (change === "default-ref") {
              state.repository.default_branch = "renamed";
              state.reference.ref = "refs/heads/renamed";
              state.reference.url = `https://api.github.com/repos/${fixture.evidence.repository}/git/refs/heads/renamed`;
            } else if (change === "default-tip")
              state.reference.object.sha = fixture.evidence.headSha;
            else if (change === "head") state.pullRequest.head.sha = state.analysisRun.head_sha;
            else if (change === "base") state.pullRequest.base.sha = state.analysisRun.head_sha;
            else if (change === "body") state.pullRequest.body = "changed after collection";
            else state.analysisRun.conclusion = change;
          }),
        ).rejects.toThrow();
        expect(fixture.writes).toHaveLength(boundary === "summary" ? 0 : 1);
        expect(fixture.writes.some(({ path }) => path.endsWith("/check-runs"))).toBe(false);
      } finally {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
      }
    }
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
