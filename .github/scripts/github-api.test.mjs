import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertPositiveInteger,
  assertSha,
  collaboratorPermission,
  GitHubApiError,
  permissionRank,
  repositoryFromEnvironment,
} from "./github-api.mjs";
import {
  ANALYSIS_WORKFLOW_NAME,
  ANALYSIS_WORKFLOW_PATH,
  APPLICATION_PATH,
  buildCompletedCheckPayload,
  buildPendingCheckPayload,
  classifyDispositionEvent,
  isAgentProofSummaryComment,
  isTrustedPullRequestAuthor,
  parseRawArtifactName,
  sanitizeMarkdownCell,
  validateAnalysisRun,
  validateEvidenceHandoff,
  validateRulesetPayload,
} from "./workflow-helpers.mjs";

const HEAD_SHA = "0123456789abcdef0123456789abcdef01234567";
const BASE_SHA = "89abcdef0123456789abcdef0123456789abcdef";
const RUN_SHA = "fedcba9876543210fedcba9876543210fedcba98";
const ARTIFACT_SHA256 = "a".repeat(64);

test("assertSha normalizes a full SHA", () => {
  const upper = "ABCDEF0123456789ABCDEF0123456789ABCDEF01";
  assert.equal(assertSha(upper), upper.toLowerCase());
});

test("assertSha rejects abbreviated and injected values", () => {
  assert.throws(() => assertSha("abc123"), /40-character Git SHA/);
  assert.throws(
    () => assertSha("0123456789abcdef0123456789abcdef01234567;echo"),
    /40-character Git SHA/,
  );
});

test("assertPositiveInteger accepts only canonical positive integers", () => {
  assert.equal(assertPositiveInteger("42", "number"), 42);
  assert.equal(assertPositiveInteger(42, "number"), 42);
  for (const value of ["1.5", "-1", "1e2", " 42", "01", true]) {
    assert.throws(() => assertPositiveInteger(value, "number"), /positive integer/);
  }
});

test("permissionRank is fail closed for unknown permissions", () => {
  assert.ok(permissionRank("admin") > permissionRank("maintain"));
  assert.ok(permissionRank("maintain") > permissionRank("write"));
  assert.equal(permissionRank("unexpected"), 0);
});

test("collaborator authorization treats only a real 404 as no access", async () => {
  const previousFetch = globalThis.fetch;
  const previousToken = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = "test-token";
  try {
    globalThis.fetch = async () => ({
      ok: false,
      status: 404,
      text: async () => "not found",
    });
    assert.equal(
      await collaboratorPermission({
        owner: "octo-org",
        repo: "agentproof",
        username: "octocat",
      }),
      "none",
    );

    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      text: async () => "server error",
    });
    await assert.rejects(
      collaboratorPermission({
        owner: "octo-org",
        repo: "agentproof",
        username: "octocat",
      }),
      GitHubApiError,
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = previousToken;
    }
  }
});

test("repositoryFromEnvironment requires exactly OWNER/REPO", () => {
  const previous = process.env.GITHUB_REPOSITORY;
  process.env.GITHUB_REPOSITORY = "octo-org/agentproof";
  assert.deepEqual(repositoryFromEnvironment(), {
    owner: "octo-org",
    repo: "agentproof",
    fullName: "octo-org/agentproof",
  });

  for (const value of ["invalid", "owner/repo/extra", "owner/repo\nbad"]) {
    process.env.GITHUB_REPOSITORY = value;
    assert.throws(() => repositoryFromEnvironment(), /OWNER\/REPO/);
  }

  if (previous === undefined) {
    delete process.env.GITHUB_REPOSITORY;
  } else {
    process.env.GITHUB_REPOSITORY = previous;
  }
});

test("raw artifact names bind one PR to one full head SHA", () => {
  assert.deepEqual(parseRawArtifactName(`agentproof-raw-pr-42-${HEAD_SHA}`), {
    pullRequestNumber: 42,
    headSha: HEAD_SHA,
  });
  assert.throws(() => parseRawArtifactName(`agentproof-raw-pr-42-${HEAD_SHA}-extra`), /malformed/);
  assert.throws(() => parseRawArtifactName("agentproof-raw-pr-01-deadbeef"), /malformed/);
});

function analysisFixture(eventName = "pull_request_target") {
  const repository = {
    id: 100,
    full_name: "octo-org/agentproof",
    default_branch: "main",
  };
  const workflow = {
    id: 200,
    name: ANALYSIS_WORKFLOW_NAME,
    path: ANALYSIS_WORKFLOW_PATH,
    state: "active",
  };
  const run = {
    id: 300,
    run_attempt: 1,
    workflow_id: workflow.id,
    name: ANALYSIS_WORKFLOW_NAME,
    path: ANALYSIS_WORKFLOW_PATH,
    status: "completed",
    conclusion: "success",
    event: eventName,
    repository: { id: repository.id, full_name: repository.full_name },
    head_branch: eventName === "workflow_dispatch" ? "main" : "feature",
    head_sha: RUN_SHA,
    pull_requests:
      eventName === "pull_request_target"
        ? [
            {
              number: 42,
              head: { sha: HEAD_SHA },
              base: { sha: BASE_SHA, repo: { id: repository.id } },
            },
          ]
        : [],
  };
  const event = {
    action: "completed",
    workflow_run: {
      id: run.id,
      run_attempt: run.run_attempt,
      workflow_id: workflow.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      event: run.event,
      repository: run.repository,
      head_branch: run.head_branch,
      head_sha: run.head_sha,
    },
  };
  const artifacts = [
    {
      id: 400,
      name: `agentproof-raw-pr-42-${HEAD_SHA}`,
      expired: false,
      size_in_bytes: 1024,
      digest: `sha256:${ARTIFACT_SHA256}`,
      workflow_run: {
        id: run.id,
        repository_id: repository.id,
        head_branch: run.head_branch,
        head_sha: run.head_sha,
      },
    },
  ];
  return { event, run, workflow, repository, artifacts };
}

test("analysis provenance accepts an exact protected pull-request run", () => {
  const fixture = analysisFixture();
  assert.deepEqual(validateAnalysisRun(fixture), {
    runId: 300,
    artifactId: 400,
    artifactName: `agentproof-raw-pr-42-${HEAD_SHA}`,
    artifactDigest: `sha256:${ARTIFACT_SHA256}`,
    pullRequestNumber: 42,
    headSha: HEAD_SHA,
  });
});

test("analysis provenance accepts default-branch workflow dispatch only", () => {
  const fixture = analysisFixture("workflow_dispatch");
  assert.equal(validateAnalysisRun(fixture).pullRequestNumber, 42);
  fixture.run.head_branch = "feature";
  fixture.event.workflow_run.head_branch = "feature";
  fixture.artifacts[0].workflow_run.head_branch = "feature";
  assert.throws(() => validateAnalysisRun(fixture), /default branch/);
});

test("analysis provenance rejects a pull_request run with head-controlled workflow code", () => {
  const fixture = analysisFixture();
  fixture.run.event = "pull_request";
  fixture.event.workflow_run.event = "pull_request";
  assert.throws(() => validateAnalysisRun(fixture), /allowed analysis trigger/);
});

test("analysis provenance rejects wrong workflow, repository, and artifact sets", () => {
  const wrongWorkflow = analysisFixture();
  wrongWorkflow.run.path = ".github/workflows/forged.yml";
  assert.throws(() => validateAnalysisRun(wrongWorkflow), /protected AgentProof/);

  const wrongRepository = analysisFixture();
  wrongRepository.run.repository.full_name = "octo-org/other";
  assert.throws(() => validateAnalysisRun(wrongRepository), /repository/);

  const duplicateArtifact = analysisFixture();
  duplicateArtifact.artifacts.push({ ...duplicateArtifact.artifacts[0], id: 401 });
  assert.throws(() => validateAnalysisRun(duplicateArtifact), /exactly one/);

  const missingDigest = analysisFixture();
  missingDigest.artifacts[0].digest = null;
  assert.throws(() => validateAnalysisRun(missingDigest), /digest/);
});

test("comment edits and deletes revalidate commands without trusting the editor", () => {
  assert.deepEqual(
    classifyDispositionEvent({
      action: "created",
      comment: { body: "/agentproof reject AP-TEST-SUITE-001" },
    }),
    {
      shouldDispatch: true,
      requiresAuthorization: true,
      reason: "new command",
    },
  );
  assert.deepEqual(
    classifyDispositionEvent({
      action: "edited",
      comment: { body: "command removed" },
      changes: {
        body: { from: "/agentproof accept-exception AP-POL-RETENTION-001" },
      },
    }),
    {
      shouldDispatch: true,
      requiresAuthorization: false,
      reason: "command edited away",
    },
  );
  assert.equal(
    classifyDispositionEvent({
      action: "deleted",
      comment: { body: "/agentproof reject AP-TEST-SUITE-001" },
    }).shouldDispatch,
    true,
  );
  assert.equal(
    classifyDispositionEvent({
      action: "created",
      comment: { body: "ordinary review note" },
    }).shouldDispatch,
    false,
  );
});

test("automatic head execution is limited to trusted PR author associations", () => {
  for (const author_association of ["OWNER", "MEMBER", "COLLABORATOR"]) {
    assert.equal(isTrustedPullRequestAuthor({ author_association }), true);
  }
  for (const author_association of ["CONTRIBUTOR", "FIRST_TIMER", "NONE"]) {
    assert.equal(isTrustedPullRequestAuthor({ author_association }), false);
  }
});

function evidenceHandoffFixture() {
  const repository = {
    id: 100,
    full_name: "octo-org/agentproof",
    default_branch: "main",
  };
  const pullRequest = {
    number: 42,
    state: "open",
    html_url: "https://github.com/octo-org/agentproof/pull/42",
    body: "## AI assistance origin\n\n- Classification: self-declared\n- Declared tool: Copilot",
    user: { login: "octocat" },
    author_association: "MEMBER",
    base: {
      ref: "main",
      sha: BASE_SHA,
      repo: { full_name: repository.full_name },
    },
    head: { ref: "feature", sha: HEAD_SHA },
  };
  const metadata = {
    schemaVersion: "1.0.0",
    repository: repository.full_name,
    pullRequestNumber: pullRequest.number,
    pullRequestUrl: pullRequest.html_url,
    pullRequestBody: pullRequest.body,
    author: pullRequest.user.login,
    authorAssociation: pullRequest.author_association,
    baseRef: pullRequest.base.ref,
    baseSha: pullRequest.base.sha,
    headRef: pullRequest.head.ref,
    headSha: pullRequest.head.sha,
    appPath: APPLICATION_PATH,
  };
  const rawEvidence = {
    schemaVersion: "1.0.0",
    documentType: "raw",
    repository: repository.full_name,
    pullRequestNumber: pullRequest.number,
    baseSha: BASE_SHA,
    headSha: HEAD_SHA,
    artifact: {
      sha256: ARTIFACT_SHA256,
      workflowRunUrl: "https://github.com/octo-org/agentproof/actions/runs/300",
    },
  };
  const expected = {
    pullRequestNumber: 42,
    headSha: HEAD_SHA,
    artifactName: `agentproof-raw-pr-42-${HEAD_SHA}`,
    runId: 300,
    serverUrl: "https://github.com",
  };
  return { metadata, rawEvidence, expected, repository, pullRequest };
}

test("evidence handoff binds artifact content to current GitHub state", () => {
  const fixture = evidenceHandoffFixture();
  assert.deepEqual(validateEvidenceHandoff(fixture), {
    number: 42,
    headSha: HEAD_SHA,
    baseSha: BASE_SHA,
  });
  fixture.pullRequest.body = "edited after analysis";
  assert.throws(() => validateEvidenceHandoff(fixture), /body changed/);
});

test("evidence handoff rejects an application path not selected by protected code", () => {
  for (const appPath of [
    `${APPLICATION_PATH}/unexpected`,
    "..",
    "/tmp/app",
    "C:\\app",
    undefined,
  ]) {
    const fixture = evidenceHandoffFixture();
    fixture.metadata.appPath = appPath;
    assert.throws(() => validateEvidenceHandoff(fixture), /application path/);
  }
});

test("evidence handoff accepts the legacy path alias but rejects conflicting values", () => {
  const fixture = evidenceHandoffFixture();
  fixture.metadata.samplePath = fixture.metadata.appPath;
  assert.equal(validateEvidenceHandoff(fixture).headSha, HEAD_SHA);
  delete fixture.metadata.appPath;
  assert.equal(validateEvidenceHandoff(fixture).headSha, HEAD_SHA);
  fixture.metadata.appPath = `${APPLICATION_PATH}/unexpected`;
  assert.throws(() => validateEvidenceHandoff(fixture), /aliases conflict/);
});

test("Check Runs API payloads separate immutable create fields from updates", () => {
  const detailsUrl = "https://github.com/octo-org/agentproof/actions/runs/500";
  const completed = buildCompletedCheckPayload({
    headSha: HEAD_SHA,
    conclusion: "success",
    detailsUrl,
    now: "2026-09-02T10:00:00.000Z",
    title: "Complete",
    summary: "Summary",
  });
  assert.equal(completed.create.head_sha, HEAD_SHA);
  assert.equal(completed.create.name, "AgentProof / gate");
  assert.equal(completed.update.head_sha, undefined);
  assert.equal(completed.update.name, undefined);
  assert.equal(completed.update.status, "completed");
  assert.equal(completed.update.conclusion, "success");

  const pending = buildPendingCheckPayload({
    headSha: HEAD_SHA,
    detailsUrl,
    now: "2026-09-02T10:00:00.000Z",
    reason: "a deleted command",
  });
  assert.equal(pending.status, "in_progress");
  assert.equal(pending.conclusion, undefined);
  assert.equal(pending.head_sha, HEAD_SHA);
});

test("only the GitHub Actions bot can own the marker summary", () => {
  const body = "<!-- agentproof-gate-summary -->\nsummary";
  assert.equal(
    isAgentProofSummaryComment({
      body,
      user: { id: 41898282, login: "github-actions[bot]", type: "Bot" },
    }),
    true,
  );
  assert.equal(
    isAgentProofSummaryComment({
      body,
      user: { id: 1, login: "attacker", type: "User" },
    }),
    false,
  );
});

test("Markdown cells suppress table and mention injection", () => {
  assert.equal(sanitizeMarkdownCell("line 1\n| @octocat"), "line 1 \\| @\u200boctocat");
});

test("checked-in ruleset has the required fail-closed controls", async () => {
  const payload = JSON.parse(
    await readFile(new URL("../rulesets/agentproof.json", import.meta.url), "utf8"),
  );
  assert.equal(validateRulesetPayload(payload), payload);
});
