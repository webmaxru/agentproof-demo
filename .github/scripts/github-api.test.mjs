import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { tsImport } from "tsx/esm/api";
import { parse as parseYaml } from "yaml";
import {
  validateCaptureCheckout,
  validateCapturedArtifact,
  validateCapturedCheck,
  validateCapturedEvidence,
  validateCapturedPublisher,
  validateCapturedSubject,
} from "../../hackathon-2026/assets/recording-kit/capture-state.mjs";
import { ANALYSIS_WAIT_MS, dispatchRevalidation } from "./dispatch-revalidation.mjs";
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
  GITHUB_ACTIONS_BOT_ID,
  PUBLISH_WORKFLOW_NAME,
  PUBLISH_WORKFLOW_PATH,
  buildCompletedCheckPayload,
  buildPendingCheckPayload,
  classifyDispositionEvent,
  isAgentProofSummaryComment,
  isTrustedPullRequestAuthor,
  parseRawArtifactName,
  resolveTrustedWorkflowRevision,
  sanitizeMarkdownCell,
  validateAnalysisRun,
  validateCompletedAnalysisRun,
  validateDispatchedAnalysis,
  validateEvidenceHandoff,
  validateNativePublisherRun,
  validatePublisherRun,
  validateRulesetPayload,
  validateUnchangedPullRequest,
} from "./workflow-helpers.mjs";

const HEAD_SHA = "0123456789abcdef0123456789abcdef01234567";
const BASE_SHA = "89abcdef0123456789abcdef0123456789abcdef";
const RUN_SHA = "fedcba9876543210fedcba9876543210fedcba98";
const ARTIFACT_SHA256 = "a".repeat(64);
const captureCore = await tsImport("../../packages/evidence-core/src/index.ts", import.meta.url);
const captureFixtures = await tsImport(
  "../../packages/evidence-core/tests/helpers.ts",
  import.meta.url,
);

function captureFixture(eventName = "workflow_dispatch", conclusion = "success") {
  const { run, workflow, repository } = publisherFixture(eventName);
  const workflowRunUrl = `https://github.com/${repository.full_name}/actions/runs/500`;
  Object.assign(run, {
    status: "completed",
    conclusion,
    html_url: workflowRunUrl,
    head_sha: RUN_SHA,
  });
  return {
    run,
    workflow,
    repository,
    runId: 500,
    runAttempt: 1,
    baseSha: BASE_SHA,
    workflowSha: RUN_SHA,
    workflowRunUrl,
    conclusion,
  };
}

test("presenter validates both native Publisher routes independently of an older policy base", () => {
  for (const eventName of ["workflow_run", "workflow_dispatch"]) {
    for (const conclusion of ["success", "failure"]) {
      const input = captureFixture(eventName, conclusion);
      assert.deepEqual(validateCapturedPublisher(input, validateNativePublisherRun), {
        runId: 500,
        runAttempt: 1,
      });
      assert.equal(Object.hasOwn(input, "event"), false);
      assert.equal(Object.hasOwn(input, "context"), false);
      assert.notEqual(input.baseSha, input.workflowSha);
    }
  }
});

test("presenter rejects stale attempts, untrusted workflow revisions and incomplete publication", () => {
  const mutations = [
    (input) => {
      input.run.id = 501;
    },
    (input) => {
      input.run.run_attempt = 2;
    },
    (input) => {
      input.run.workflow_id = 999;
    },
    (input) => {
      input.workflow.state = "disabled";
    },
    (input) => {
      input.run.head_branch = "feature";
    },
    (input) => {
      input.run.head_sha = HEAD_SHA;
    },
    (input) => {
      input.workflowSha = input.baseSha;
    },
    (input) => {
      input.run.head_repository = { ...input.repository, id: 999 };
    },
    (input) => {
      input.run.event = "pull_request_target";
    },
    (input) => {
      input.run.html_url += "/jobs/1";
    },
    (input) => {
      input.run.status = "in_progress";
    },
    (input) => {
      input.run.conclusion = "failure";
    },
    (input) => {
      input.conclusion = input.run.conclusion = "cancelled";
    },
  ];
  for (const mutate of mutations) {
    const input = captureFixture();
    mutate(input);
    assert.throws(() => validateCapturedPublisher(input, validateNativePublisherRun));
  }
});

test("candidate presenter refuses an orchestration checkout without its native validator", () => {
  assert.throws(
    () => validateCapturedPublisher(captureFixture(), undefined),
    /Protected orchestration checkout lacks the native Publisher validator/,
  );
});

test("presenter trusts only a clean checkout of the independently resolved protected default", () => {
  const fixture = {
    repository: { default_branch: "main" },
    branch: { name: "main", protected: true, commit: { sha: RUN_SHA } },
    headSha: RUN_SHA,
    changes: "",
  };
  assert.equal(validateCaptureCheckout(fixture), RUN_SHA);
  const mutations = [
    (input) => {
      input.headSha = BASE_SHA;
    },
    (input) => {
      input.headSha = HEAD_SHA;
    },
    (input) => {
      input.branch.commit.sha = HEAD_SHA;
    },
    (input) => {
      input.branch.protected = false;
    },
    (input) => {
      input.repository.default_branch = "renamed";
    },
    (input) => {
      input.branch.name = "feature";
    },
    (input) => {
      input.changes = " M .github/scripts/workflow-helpers.mjs";
    },
  ];
  for (const mutate of mutations) {
    const input = structuredClone(fixture);
    mutate(input);
    assert.throws(() => validateCaptureCheckout(input));
  }
});

function capturedEvidenceFixture({ blockers = false } = {}) {
  const native = captureFixture();
  const raw = captureFixtures.rawEvidenceFixture();
  raw.repository = native.repository.full_name;
  raw.baseSha = BASE_SHA;
  raw.headSha = HEAD_SHA;
  for (const finding of raw.findings) finding.sourceSha = HEAD_SHA;
  const dispositions = captureFixtures.dispositionInput();
  if (blockers) {
    raw.findings.find((finding) => finding.id === captureCore.FINDING_IDS.testSuite).facts = {
      total: 1,
      passed: 0,
      failed: 1,
      skipped: 0,
      testCases: [],
    };
    raw.findings.find((finding) => finding.id === captureCore.FINDING_IDS.dataRetention).facts = {};
    raw.findings.find((finding) => finding.id === captureCore.FINDING_IDS.testCoverage).facts = {};
    dispositions.comments.push(
      captureFixtures.validAcceptance({
        body: `/agentproof accept-exception ${captureCore.FINDING_IDS.dataRetention}
sha: ${HEAD_SHA}
reason: Synthetic test decision with bounded retention pending remediation.
expires: 2026-09-20`,
      }),
    );
  }
  const policy = captureFixtures.policyFixture();
  const input = captureCore.evaluateEvidence({
    rawEvidence: captureCore.withArtifactDigest(raw),
    policy,
    dispositions,
    workflowRunUrl: native.workflowRunUrl,
  });
  const check = {
    id: 600,
    name: "AgentProof / gate",
    app: { id: 15368 },
    status: "completed",
    conclusion: input.gate.conclusion,
    head_sha: HEAD_SHA,
    details_url: `https://github.com/${native.repository.full_name}/runs/600`,
    output: {
      summary: [
        `**Result:** ${input.gate.conclusion === "success" ? "PASS" : "BLOCKED"}`,
        "",
        `- **Head SHA:** \`${HEAD_SHA}\``,
        `- **Policy digest:** \`${input.policy.sha256}\``,
        `- **Evidence digest:** \`${input.artifact.sha256}\``,
        "- **Counts:** bounded fixture",
        "",
        `[Workflow run](${native.workflowRunUrl})`,
      ].join("\n"),
    },
  };
  return {
    input,
    repository: native.repository,
    prNumber: raw.pullRequestNumber,
    headSha: HEAD_SHA,
    baseSha: BASE_SHA,
    check,
    policy,
    now: Date.parse(captureFixtures.EVALUATED_AT),
  };
}

test("presenter verifies the exact native check footer and canonical evidence under the old policy", () => {
  const fixture = capturedEvidenceFixture();
  assert.deepEqual(validateCapturedEvidence(fixture, captureCore), fixture.input);
  assert.deepEqual(validateCapturedCheck(fixture), {
    runId: 500,
    workflowRunUrl: fixture.input.artifact.workflowRunUrl,
    policyDigest: fixture.input.policy.sha256,
    evidenceDigest: fixture.input.artifact.sha256,
  });
  fixture.check.details_url = fixture.input.artifact.workflowRunUrl;
  assert.doesNotThrow(() => validateCapturedEvidence(fixture, captureCore));
});

test("presenter preserves pass, fail, unknown and exception without relabeling a blocking gate", () => {
  const fixture = capturedEvidenceFixture({ blockers: true });
  const evidence = validateCapturedEvidence(fixture, captureCore);
  assert.equal(evidence.gate.conclusion, "failure");
  assert.deepEqual([...new Set(evidence.findings.map((finding) => finding.state))].sort(), [
    "exception",
    "fail",
    "pass",
    "unknown",
  ]);
  fixture.now = Date.parse("2026-09-21T00:00:00.000Z");
  assert.throws(() => validateCapturedEvidence(fixture, captureCore), /validity horizon/);
});

test("presenter rejects forged checks, ambiguous footers and digest substrings outside the header", () => {
  const mutations = [
    (input) => {
      input.check.app.id = 1;
    },
    (input) => {
      input.check.head_sha = RUN_SHA;
    },
    (input) => {
      input.check.name = "Build, lint, and test";
    },
    (input) => {
      input.check.status = "in_progress";
    },
    (input) => {
      input.check.details_url += "1";
    },
    (input) => {
      input.check.output.summary += "\nnot the footer";
    },
    (input) => {
      input.check.output.summary += `\n\n[Workflow run](${input.input.artifact.workflowRunUrl})`;
    },
    (input) => {
      input.check.output.summary = input.check.output.summary.replace(
        input.repository.full_name,
        "other/repository",
      );
    },
    (input) => {
      input.check.output.summary = input.check.output.summary.replace(
        `- **Evidence digest:** \`${input.input.artifact.sha256}\``,
        `Finding text includes ${input.input.artifact.sha256}`,
      );
    },
    (input) => {
      input.check.output.summary = input.check.output.summary.replace("PASS", "BLOCKED");
    },
  ];
  for (const mutate of mutations) {
    const input = capturedEvidenceFixture();
    mutate(input);
    assert.throws(() => validateCapturedCheck(input));
  }
});

test("presenter rejects invalid canonical content, finding sources, policy bases and evidence identities", () => {
  const mutations = [
    (fixture) => {
      fixture.input.findings[0].summary = "Modified without updating canonical digest.";
    },
    (fixture) => {
      fixture.input.findings[0].sourceSha = RUN_SHA;
      fixture.input = captureCore.withArtifactDigest(fixture.input);
    },
    (fixture) => {
      fixture.input.baseSha = fixture.input.policy.baseSha = RUN_SHA;
      fixture.input = captureCore.withArtifactDigest(fixture.input);
    },
    (fixture) => {
      fixture.input.repository = "other/repository";
      fixture.input = captureCore.withArtifactDigest(fixture.input);
    },
    (fixture) => {
      fixture.input.pullRequestNumber += 1;
      fixture.input = captureCore.withArtifactDigest(fixture.input);
    },
    (fixture) => {
      fixture.input.artifact.workflowRunUrl += "1";
      fixture.input = captureCore.withArtifactDigest(fixture.input);
    },
    (fixture) => {
      fixture.policy.rules.tests.coverage.minimum.lines -= 1;
    },
    (fixture) => {
      fixture.check.output.summary = fixture.check.output.summary.replace(
        fixture.input.artifact.sha256,
        "f".repeat(64),
      );
    },
  ];
  for (const mutate of mutations) {
    const fixture = capturedEvidenceFixture();
    mutate(fixture);
    assert.throws(() => validateCapturedEvidence(fixture, captureCore));
  }
});

test("presenter artifact provenance uses the protected workflow revision, not the old evidence base", () => {
  const { repository } = captureFixture();
  const artifactName = `agentproof-evidence-pr-7-${HEAD_SHA}`;
  const fixture = {
    artifactName,
    repository,
    publisherIdentity: { runId: 500, runAttempt: 1 },
    workflowSha: RUN_SHA,
    artifact: {
      id: 700,
      name: artifactName,
      expired: false,
      size_in_bytes: 1024,
      digest: `sha256:${ARTIFACT_SHA256}`,
      workflow_run: {
        id: 500,
        repository_id: repository.id,
        head_branch: repository.default_branch,
        head_sha: RUN_SHA,
      },
    },
  };
  assert.doesNotThrow(() => validateCapturedArtifact(fixture));
  const mutations = [
    (input) => {
      input.artifact.workflow_run.head_sha = BASE_SHA;
    },
    (input) => {
      input.artifact.workflow_run.id += 1;
    },
    (input) => {
      input.artifact.workflow_run.repository_id += 1;
    },
    (input) => {
      input.artifact.workflow_run.head_branch = "feature";
    },
    (input) => {
      input.artifact.digest = ARTIFACT_SHA256;
    },
    (input) => {
      input.artifact.name += "-other";
    },
    (input) => {
      input.artifact.expired = true;
    },
    (input) => {
      input.artifact.size_in_bytes = 25 * 1024 * 1024 + 1;
    },
  ];
  for (const mutate of mutations) {
    const input = structuredClone(fixture);
    mutate(input);
    assert.throws(() => validateCapturedArtifact(input));
  }
});

test("presenter rechecks native head, body, policy base and default branch after download", () => {
  const { repository, pullRequest } = evidenceHandoffFixture();
  pullRequest.base.repo.id = repository.id;
  pullRequest.updated_at = "2026-10-01T10:00:00Z";
  const fixture = {
    repository,
    pullRequest,
    previous: structuredClone({ repository, pullRequest }),
  };
  assert.doesNotThrow(() => validateCapturedSubject(fixture, validateUnchangedPullRequest));
  const mutations = [
    (input) => {
      input.pullRequest.head.sha = RUN_SHA;
    },
    (input) => {
      input.pullRequest.base.sha = RUN_SHA;
    },
    (input) => {
      input.pullRequest.body += "\nChanged metadata";
    },
    (input) => {
      input.repository.default_branch = input.pullRequest.base.ref = "renamed";
    },
    (input) => {
      input.repository.id += 1;
    },
    (input) => {
      input.pullRequest.updated_at = "2026-10-01T10:01:00Z";
    },
    (input) => {
      input.pullRequest.state = "closed";
    },
  ];
  for (const mutate of mutations) {
    const input = structuredClone(fixture);
    mutate(input);
    assert.throws(() => validateCapturedSubject(input, validateUnchangedPullRequest));
  }
});

function defaultRefFixture(sha = BASE_SHA) {
  return {
    ref: "refs/heads/main",
    url: "https://api.github.com/repos/octo-org/agentproof/git/refs/heads/main",
    object: { type: "commit", sha },
  };
}

let scriptInvocation = 0;
async function runWorkflowScript(script, environment, request) {
  const previousFetch = globalThis.fetch;
  const previousEnvironment = new Map(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  try {
    Object.assign(process.env, environment);
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers["X-GitHub-Api-Version"], "2026-03-10");
      assert.equal(options.method, "GET");
      const response = await request(String(url).replace("https://api.github.com", ""));
      return { ok: true, status: 200, json: async () => response };
    };
    await import(`./${script}.mjs?test=${++scriptInvocation}`);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of previousEnvironment) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("workflow revision is independently resolved from the native default ref, not a PR base", async () => {
  const { repository } = analysisFixture();
  const requests = [];
  const request = async (path) => {
    requests.push(path);
    return defaultRefFixture(RUN_SHA);
  };
  assert.equal(await resolveTrustedWorkflowRevision({ repository }, request), RUN_SHA);
  assert.equal(
    await resolveTrustedWorkflowRevision({ repository, expectedSha: RUN_SHA }, request),
    RUN_SHA,
  );
  await assert.rejects(
    resolveTrustedWorkflowRevision({ repository, expectedSha: BASE_SHA }, request),
    /workflow revision changed/,
  );
  assert.deepEqual(requests, Array(3).fill("/repos/octo-org/agentproof/git/ref/heads/main"));
  for (const mutate of [
    (ref) => {
      ref.ref = "refs/heads/feature";
    },
    (ref) => {
      ref.url = "https://api.github.com/repos/other/repo/git/refs/heads/main";
    },
    (ref) => {
      ref.object.type = "tag";
    },
    (ref) => {
      ref.object.sha = "abc123";
    },
  ]) {
    const ref = defaultRefFixture();
    mutate(ref);
    await assert.rejects(resolveTrustedWorkflowRevision({ repository }, async () => ref));
  }
  await assert.rejects(
    resolveTrustedWorkflowRevision({ repository: { ...repository, default_branch: undefined } }),
    /default branch is missing/,
  );
});

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
    head_repository: { id: repository.id, full_name: repository.full_name },
    actor: { id: 12, login: "octocat", type: "User" },
    triggering_actor: { id: 12, login: "octocat", type: "User" },
    head_branch: eventName === "workflow_dispatch" ? "main" : "feature",
    head_sha: eventName === "workflow_dispatch" ? RUN_SHA : HEAD_SHA,
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
  return { event, run, workflow, repository, artifacts, expectedWorkflowSha: RUN_SHA };
}

test("analysis provenance accepts an exact protected pull-request run", () => {
  const fixture = analysisFixture();
  assert.deepEqual(validateAnalysisRun(fixture), {
    runId: 300,
    runAttempt: 1,
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

function controllerAnalysisFixture(workflowSha = BASE_SHA) {
  const fixture = analysisFixture("workflow_dispatch");
  fixture.run.actor = {
    id: GITHUB_ACTIONS_BOT_ID,
    login: "github-actions[bot]",
    type: "Bot",
  };
  fixture.run.triggering_actor = fixture.run.actor;
  fixture.run.head_sha = workflowSha;
  fixture.artifacts[0].workflow_run.head_sha = workflowSha;
  fixture.event.workflow_run.head_sha = workflowSha;
  fixture.expectedWorkflowSha = workflowSha;
  return fixture;
}

function publisherFixture(eventName = "workflow_dispatch", workflowSha = BASE_SHA) {
  const { repository } = analysisFixture();
  const workflow = {
    id: 201,
    name: PUBLISH_WORKFLOW_NAME,
    path: PUBLISH_WORKFLOW_PATH,
    state: "active",
  };
  return {
    eventName,
    expectedWorkflowSha: workflowSha,
    repository,
    workflow,
    event: {
      repository,
      inputs: { analysis_run_id: "300", analysis_run_attempt: "1" },
    },
    run: {
      id: 500,
      run_attempt: 1,
      workflow_id: workflow.id,
      name: workflow.name,
      path: workflow.path,
      event: eventName,
      repository,
      head_repository: repository,
      head_branch: "main",
      head_sha: workflowSha,
    },
    context: {
      runId: 500,
      runAttempt: 1,
      ref: "refs/heads/main",
      sha: workflowSha,
      workflowRef: `${repository.full_name}/${PUBLISH_WORKFLOW_PATH}@refs/heads/main`,
    },
  };
}

test("publisher native identity is bound to the protected default branch for both triggers", () => {
  for (const eventName of ["workflow_dispatch", "workflow_run"]) {
    assert.doesNotThrow(() => validatePublisherRun(publisherFixture(eventName)));
    const mutations = [
      (fixture) => {
        fixture.run.id += 1;
      },
      (fixture) => {
        fixture.run.run_attempt += 1;
      },
      (fixture) => {
        fixture.run.workflow_id += 1;
      },
      (fixture) => {
        fixture.run.path = ANALYSIS_WORKFLOW_PATH;
      },
      (fixture) => {
        fixture.run.name = ANALYSIS_WORKFLOW_NAME;
      },
      (fixture) => {
        fixture.workflow.state = "disabled_manually";
      },
      (fixture) => {
        fixture.run.repository = { id: 999, full_name: "other/repo" };
      },
      (fixture) => {
        fixture.run.head_repository = { id: 999, full_name: "other/repo" };
      },
      (fixture) => {
        fixture.run.head_branch = "feature";
      },
      (fixture) => {
        fixture.run.head_sha = HEAD_SHA;
      },
      (fixture) => {
        fixture.run.event = "push";
      },
      (fixture) => {
        fixture.context.ref = "refs/heads/feature";
      },
      (fixture) => {
        fixture.context.workflowRef = `${fixture.repository.full_name}/${PUBLISH_WORKFLOW_PATH}@refs/heads/feature`;
      },
      (fixture) => {
        fixture.event.repository = { id: 999, full_name: "other/repo" };
      },
    ];
    for (const mutate of mutations) {
      const fixture = publisherFixture(eventName);
      mutate(fixture);
      assert.throws(() => validatePublisherRun(fixture));
    }
  }
});

test("read-only consumers validate native Publisher identity without inventing event or runner context", () => {
  for (const eventName of ["workflow_run", "workflow_dispatch"]) {
    const { run, workflow, repository } = publisherFixture(eventName);
    const input = {
      run,
      workflow,
      repository,
      expectedRunId: 500,
      expectedRunAttempt: 1,
      expectedHeadSha: BASE_SHA,
    };
    assert.deepEqual(validateNativePublisherRun(input), { runId: 500, runAttempt: 1 });
    const mutations = [
      (value) => {
        value.expectedRunId = 501;
      },
      (value) => {
        value.expectedRunAttempt = 2;
      },
      (value) => {
        value.expectedHeadSha = HEAD_SHA;
      },
      (value) => {
        value.expectedHeadSha = undefined;
      },
      (value) => {
        value.run.event = "push";
      },
      (value) => {
        value.run.path = ANALYSIS_WORKFLOW_PATH;
      },
      (value) => {
        value.run.workflow_id += 1;
      },
      (value) => {
        value.workflow.state = "disabled_manually";
      },
      (value) => {
        value.run.repository = { id: 999, full_name: "other/repo" };
      },
      (value) => {
        value.run.head_repository = { id: 999, full_name: "other/repo" };
      },
      (value) => {
        value.run.head_branch = "feature";
      },
      (value) => {
        value.run.head_sha = HEAD_SHA;
      },
      (value) => {
        value.repository.default_branch = undefined;
        value.run.head_branch = undefined;
      },
    ];
    for (const mutate of mutations) {
      const modified = structuredClone(input);
      mutate(modified);
      assert.throws(() => validateNativePublisherRun(modified));
    }
  }
});

test("explicit publisher ingress validates exact native Analysis identity without a synthetic event", () => {
  const fixture = controllerAnalysisFixture();
  fixture.event = { inputs: { analysis_run_id: "300", analysis_run_attempt: "1" } };
  assert.equal(validateDispatchedAnalysis(fixture).runId, 300);
  const mutations = [
    (value) => {
      value.event.inputs.analysis_run_id = "301";
    },
    (value) => {
      value.event.inputs.analysis_run_attempt = "2";
    },
    (value) => {
      value.event.inputs.extra = "unexpected";
    },
    (value) => {
      value.run.run_attempt = 2;
    },
    (value) => {
      value.run.head_sha = HEAD_SHA;
    },
    (value) => {
      value.expectedWorkflowSha = undefined;
    },
    (value) => {
      value.run.workflow_id += 1;
    },
    (value) => {
      value.run.head_branch = "feature";
    },
    (value) => {
      value.run.repository = { id: 999, full_name: "other/repo" };
    },
    (value) => {
      value.run.head_repository = { id: 999, full_name: "other/repo" };
    },
    (value) => {
      value.run.actor = { id: 12, login: "octocat", type: "User" };
    },
    (value) => {
      value.run.actor.login = "other-bot";
    },
    (value) => {
      value.run.actor.type = "User";
    },
    (value) => {
      value.run.event = "pull_request_target";
    },
    (value) => {
      value.artifacts[0].workflow_run.id = 301;
    },
  ];
  for (const mutate of mutations) {
    const modified = structuredClone(fixture);
    mutate(modified);
    assert.throws(() => validateDispatchedAnalysis(modified));
  }
  for (const badId of ["01", "1e2", " 300", "-1", "300/attempts/2", 0, null, true, 2 ** 53]) {
    const modified = structuredClone(fixture);
    modified.event.inputs.analysis_run_id = badId;
    assert.throws(() => validateDispatchedAnalysis(modified), /positive integer/);
  }
});

test("automatic workflow_run publication excludes controller runs without excluding owner refreshes", () => {
  assert.throws(() => validateAnalysisRun(controllerAnalysisFixture()), /explicit publisher/);
  assert.equal(validateAnalysisRun(analysisFixture("workflow_dispatch")).runId, 300);
  assert.equal(validateAnalysisRun(analysisFixture("pull_request_target")).runId, 300);
});

test("both publisher triggers reject failed, cancelled, timed-out, or changed-attempt analyses", () => {
  for (const conclusion of ["failure", "cancelled", "timed_out", "skipped", "neutral", null]) {
    const owner = analysisFixture();
    owner.run.conclusion = conclusion;
    assert.throws(() => validateAnalysisRun(owner), /successful completed/);
    const controller = controllerAnalysisFixture();
    controller.event = { inputs: { analysis_run_id: "300", analysis_run_attempt: "1" } };
    controller.run.conclusion = conclusion;
    assert.throws(() => validateDispatchedAnalysis(controller), /successful completed/);
  }
  const fixture = analysisFixture();
  fixture.run.run_attempt = 2;
  assert.throws(() => validateAnalysisRun(fixture), /attempt changed/);
  assert.throws(
    () => validateCompletedAnalysisRun({ ...fixture, expectedRunId: 300, expectedRunAttempt: 1 }),
    /attempt changed/,
  );
});

function revalidationFixture(workflowSha = BASE_SHA) {
  const analysis = controllerAnalysisFixture(workflowSha);
  const handoff = evidenceHandoffFixture();
  const prefix = "/repos/octo-org/agentproof";
  const response = (runId) => ({
    workflow_run_id: runId,
    run_url: `https://api.github.com${prefix}/actions/runs/${runId}`,
    html_url: `https://github.com/octo-org/agentproof/actions/runs/${runId}`,
  });
  const state = {
    analysis,
    runs: [{ ...analysis.run, status: "queued", conclusion: null }, analysis.run],
    currentPullRequest: structuredClone(handoff.pullRequest),
    currentRepository: structuredClone(analysis.repository),
    analysisResponse: response(300),
    publisherResponse: response(500),
    artifactPage: { total_count: 1, artifacts: analysis.artifacts },
    calls: [],
    clock: 0,
    nextRun: 0,
    refs: [defaultRefFixture(workflowSha)],
    nextRef: 0,
  };
  const request = async (path, options = {}) => {
    state.calls.push({ path, options });
    if (path === `${prefix}/check-runs` && options.method === "POST") {
      return {
        id: 600,
        name: "AgentProof / gate",
        app: { id: 15368 },
        head_sha: HEAD_SHA,
        status: "in_progress",
        conclusion: null,
      };
    }
    if (path === `${prefix}/actions/workflows/agentproof-analyze.yml`) {
      return analysis.workflow;
    }
    if (path === `${prefix}/git/ref/heads/main`) {
      return state.refs[Math.min(state.nextRef++, state.refs.length - 1)];
    }
    if (path === `${prefix}/actions/workflows/agentproof-analyze.yml/dispatches`) {
      assert.equal(options.method, "POST");
      assert.deepEqual(options.body, {
        ref: "main",
        inputs: { pr_number: "42", expected_head_sha: HEAD_SHA },
      });
      return state.analysisResponse;
    }
    if (path === `${prefix}/actions/runs/300`) {
      return state.runs[Math.min(state.nextRun++, state.runs.length - 1)];
    }
    if (path === `${prefix}/actions/runs/300/artifacts?per_page=100`) {
      return state.artifactPage;
    }
    if (path === prefix) {
      return state.currentRepository;
    }
    if (path === `${prefix}/pulls/42`) {
      return state.currentPullRequest;
    }
    if (path === `${prefix}/actions/workflows/agentproof-publish.yml/dispatches`) {
      assert.equal(options.method, "POST");
      assert.deepEqual(options.body, {
        ref: "main",
        inputs: { analysis_run_id: "300", analysis_run_attempt: "1" },
      });
      return state.publisherResponse;
    }
    throw new Error(`Unexpected API request: ${path}`);
  };
  return {
    state,
    input: {
      repository: {
        owner: "octo-org",
        repo: "agentproof",
        fullName: analysis.repository.full_name,
      },
      repositoryData: analysis.repository,
      pullRequest: handoff.pullRequest,
      detailsUrl: "https://github.com/octo-org/agentproof/actions/runs/250",
      reason: "pull request edited",
      workflowSha,
    },
    dependencies: {
      request,
      sleep: async (milliseconds) => {
        state.clock += milliseconds;
      },
      now: () => state.clock,
    },
  };
}

test("controller invalidates, waits for the exact native Analysis, and dispatches Publisher without waiting", async () => {
  const fixture = revalidationFixture();
  assert.deepEqual(await dispatchRevalidation(fixture.input, fixture.dependencies), {
    analysisRunId: 300,
    publisherRunId: 500,
  });
  assert.equal(fixture.state.calls[0].path, "/repos/octo-org/agentproof/check-runs");
  assert.equal(fixture.state.calls[0].options.body.status, "in_progress");
  assert.equal(fixture.state.clock, 10_000);
  assert.equal(
    fixture.state.calls.at(-1).path,
    "/repos/octo-org/agentproof/actions/workflows/agentproof-publish.yml/dispatches",
  );
  assert.equal(
    fixture.state.calls.filter(({ path }) => path.endsWith("/actions/runs/300")).length,
    2,
  );
  assert.equal(
    fixture.state.calls.some(({ path }) => path.includes("/actions/runs/500")),
    false,
  );
});

test("old and equal PR bases use the independently verified current workflow revision", async () => {
  for (const workflowSha of [BASE_SHA, RUN_SHA]) {
    const fixture = revalidationFixture(workflowSha);
    assert.equal(fixture.input.pullRequest.base.sha, BASE_SHA);
    assert.deepEqual(await dispatchRevalidation(fixture.input, fixture.dependencies), {
      analysisRunId: 300,
      publisherRunId: 500,
    });
    assert.equal(fixture.input.pullRequest.base.sha, BASE_SHA);
    assert.equal(fixture.state.nextRef, 3);
  }
});

test("controller rejects default-tip changes before either dispatch and native default-ref changes", async () => {
  for (const stableReads of [0, 1, 2]) {
    const fixture = revalidationFixture(BASE_SHA);
    fixture.state.refs = [
      ...Array.from({ length: stableReads }, () => defaultRefFixture(BASE_SHA)),
      defaultRefFixture(RUN_SHA),
    ];
    await assert.rejects(
      dispatchRevalidation(fixture.input, fixture.dependencies),
      /workflow revision changed/,
    );
    assert.equal(
      fixture.state.calls.some(({ path }) => path.includes("agentproof-publish")),
      false,
    );
    if (stableReads < 2) {
      assert.equal(
        fixture.state.calls.some(({ path }) => path.endsWith("agentproof-analyze.yml/dispatches")),
        false,
      );
    }
  }
  const fixture = revalidationFixture();
  fixture.state.currentRepository.default_branch = "renamed";
  await assert.rejects(
    dispatchRevalidation(fixture.input, fixture.dependencies),
    /Repository identity changed/,
  );
  assert.equal(
    fixture.state.calls.some(({ path }) => path.includes("agentproof-publish")),
    false,
  );
});

test("controller fails closed when dispatch details are missing, malformed or cross-repository", async () => {
  for (const response of [
    undefined,
    {},
    { workflow_run_id: "01" },
    { workflow_run_id: "1e2" },
    { workflow_run_id: 2 ** 53 },
    { workflow_run_id: 300, run_url: "https://api.github.com/repos/other/repo/actions/runs/300" },
    {
      workflow_run_id: 300,
      run_url: "https://api.github.com/repos/octo-org/agentproof/actions/runs/301",
    },
  ]) {
    const fixture = revalidationFixture();
    fixture.state.analysisResponse = response;
    await assert.rejects(dispatchRevalidation(fixture.input, fixture.dependencies));
    assert.equal(
      fixture.state.calls.some(({ path }) => path.includes("agentproof-publish")),
      false,
    );
    assert.equal(
      fixture.state.calls.some(({ path }) => path.includes("/actions/runs?")),
      false,
    );
  }
});

test("controller rejects a wrong run, attempt, workflow, repository, default branch or trusted revision", async () => {
  const mutations = [
    (run) => {
      run.id = 301;
    },
    (run) => {
      run.run_attempt = 2;
    },
    (run) => {
      run.workflow_id = 999;
    },
    (run) => {
      run.path = ".github/workflows/other.yml";
    },
    (run) => {
      run.repository = { id: 999, full_name: "other/repo" };
    },
    (run) => {
      run.head_branch = "feature";
    },
    (run) => {
      run.head_sha = HEAD_SHA;
    },
    (run) => {
      run.event = "pull_request_target";
    },
    (run) => {
      run.actor = { id: 12, login: "octocat", type: "User" };
    },
    (run) => {
      run.actor.login = "other-bot";
    },
    (run) => {
      run.actor.type = "User";
    },
  ];
  for (const mutate of mutations) {
    const fixture = revalidationFixture();
    fixture.state.runs = [structuredClone(fixture.state.analysis.run)];
    mutate(fixture.state.runs[0]);
    await assert.rejects(dispatchRevalidation(fixture.input, fixture.dependencies));
    assert.equal(
      fixture.state.calls.some(({ path }) => path.includes("agentproof-publish")),
      false,
    );
  }
});

test("controller does not publish failed, cancelled, timed-out or indefinitely queued Analysis", async () => {
  for (const conclusion of ["failure", "cancelled", "timed_out", "skipped", "neutral", null]) {
    const fixture = revalidationFixture();
    fixture.state.runs = [{ ...fixture.state.analysis.run, conclusion }];
    await assert.rejects(
      dispatchRevalidation(fixture.input, fixture.dependencies),
      /without success/,
    );
    assert.equal(
      fixture.state.calls.some(({ path }) => path.includes("agentproof-publish")),
      false,
    );
  }
  const fixture = revalidationFixture();
  fixture.state.runs = [{ ...fixture.state.analysis.run, status: "queued", conclusion: null }];
  fixture.dependencies.sleep = async () => {
    fixture.state.clock += ANALYSIS_WAIT_MS;
  };
  await assert.rejects(dispatchRevalidation(fixture.input, fixture.dependencies), /bounded.*wait/);
  assert.equal(
    fixture.state.calls.some(({ path }) => path.includes("agentproof-publish")),
    false,
  );
});

test("controller rejects stale subjects, metadata and malformed artifacts before Publisher dispatch", async () => {
  const mutations = [
    (state) => {
      state.currentPullRequest.head.sha = RUN_SHA;
    },
    (state) => {
      state.currentPullRequest.base.sha = RUN_SHA;
    },
    (state) => {
      state.currentPullRequest.body = "changed after analysis";
    },
    (state) => {
      state.currentPullRequest.state = "closed";
    },
    (state) => {
      state.currentPullRequest.user.login = "other-user";
    },
    (state) => {
      state.currentRepository.default_branch = "other";
    },
    (state) => {
      state.artifactPage.total_count = 2;
    },
    (state) => {
      state.artifactPage.artifacts = [];
      state.artifactPage.total_count = 0;
    },
    (state) => {
      state.artifactPage.artifacts[0].name = `agentproof-raw-pr-43-${HEAD_SHA}`;
    },
    (state) => {
      state.artifactPage.artifacts[0].name = `agentproof-raw-pr-42-${RUN_SHA}`;
    },
    (state) => {
      state.artifactPage.artifacts[0].workflow_run.id = 301;
    },
    (state) => {
      state.artifactPage.artifacts[0].expired = true;
    },
    (state) => {
      state.artifactPage.artifacts[0].digest = null;
    },
  ];
  for (const mutate of mutations) {
    const fixture = revalidationFixture();
    mutate(fixture.state);
    await assert.rejects(dispatchRevalidation(fixture.input, fixture.dependencies));
    assert.equal(
      fixture.state.calls.some(({ path }) => path.includes("agentproof-publish")),
      false,
    );
  }
});

test("controller exposes API failures rather than redispatching or guessing an Analysis", async () => {
  const fixture = revalidationFixture();
  const request = fixture.dependencies.request;
  fixture.dependencies.request = async (path, options) => {
    if (path.endsWith("/actions/runs/300")) {
      throw new Error("native run lookup unavailable");
    }
    return request(path, options);
  };
  await assert.rejects(
    dispatchRevalidation(fixture.input, fixture.dependencies),
    /lookup unavailable/,
  );
  assert.equal(
    fixture.state.calls.filter(({ path }) => path.endsWith("/agentproof-analyze.yml/dispatches"))
      .length,
    1,
  );
  assert.equal(
    fixture.state.calls.some(({ path }) => path.includes("agentproof-publish")),
    false,
  );
});

test("publisher entrypoint resolves native provenance for both triggers and emits the exact run attempt", async () => {
  const directory = await mkdtemp(join(tmpdir(), "agentproof-publisher-test-"));
  try {
    for (const [eventName, workflowSha] of [
      ["workflow_dispatch", BASE_SHA],
      ["workflow_dispatch", RUN_SHA],
      ["workflow_run", RUN_SHA],
    ]) {
      const analysis =
        eventName === "workflow_dispatch"
          ? controllerAnalysisFixture(workflowSha)
          : analysisFixture();
      const publisher = publisherFixture(eventName, workflowSha);
      const event =
        eventName === "workflow_dispatch"
          ? publisher.event
          : { ...analysis.event, repository: analysis.repository };
      const eventPath = join(directory, `${eventName}-${workflowSha}.json`);
      const outputPath = join(directory, `${eventName}-${workflowSha}.output`);
      await writeFile(eventPath, JSON.stringify(event), "utf8");
      const environment = {
        GITHUB_TOKEN: "test-token",
        GITHUB_REPOSITORY: analysis.repository.full_name,
        GITHUB_EVENT_NAME: eventName,
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_RUN_ID: "500",
        GITHUB_RUN_ATTEMPT: "1",
        GITHUB_REF: publisher.context.ref,
        GITHUB_SHA: publisher.context.sha,
        GITHUB_WORKFLOW_REF: publisher.context.workflowRef,
        GITHUB_OUTPUT: outputPath,
      };
      const responses = new Map([
        ["/repos/octo-org/agentproof", analysis.repository],
        ["/repos/octo-org/agentproof/git/ref/heads/main", defaultRefFixture(workflowSha)],
        ["/repos/octo-org/agentproof/actions/runs/500", publisher.run],
        ["/repos/octo-org/agentproof/actions/workflows/agentproof-publish.yml", publisher.workflow],
        ["/repos/octo-org/agentproof/actions/runs/300", analysis.run],
        ["/repos/octo-org/agentproof/actions/workflows/agentproof-analyze.yml", analysis.workflow],
        [
          "/repos/octo-org/agentproof/actions/runs/300/artifacts?per_page=100",
          {
            total_count: 1,
            artifacts: analysis.artifacts,
          },
        ],
      ]);
      const request = async (path) => {
        assert.ok(responses.has(path), `Unexpected API path ${path}`);
        return responses.get(path);
      };
      await runWorkflowScript("validate-workflow-run", environment, request);
      const output = await readFile(outputPath, "utf8");
      assert.match(output, new RegExp(`^workflow_sha=${workflowSha}$`, "mu"));
      assert.match(output, /^run_id=300$/mu);
      assert.match(output, /^run_attempt=1$/mu);
      assert.match(output, /^artifact_id=400$/mu);
      assert.match(output, new RegExp(`^head_sha=${HEAD_SHA}$`, "mu"));
      responses.set("/repos/octo-org/agentproof/git/ref/heads/main", defaultRefFixture(HEAD_SHA));
      await assert.rejects(
        runWorkflowScript("validate-workflow-run", environment, request),
        /workflow revision changed/,
      );
      responses.set(
        "/repos/octo-org/agentproof/git/ref/heads/main",
        defaultRefFixture(workflowSha),
      );
      if (eventName === "workflow_dispatch") {
        analysis.run.head_sha = HEAD_SHA;
        await assert.rejects(
          runWorkflowScript("validate-workflow-run", environment, request),
          /trusted workflow revision/,
        );
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("workflow templates retain read-only Analysis, bounded controllers and disjoint publisher ingress", async () => {
  const templates = new URL("../../templates/github-workflows/", import.meta.url);
  const workflowDirectory = existsSync(templates)
    ? templates
    : new URL("../workflows/", import.meta.url);
  const [analysis, disposition, revalidate, publisher] = await Promise.all(
    ["analyze", "disposition", "revalidate", "publish"].map(async (name) =>
      parseYaml(await readFile(new URL(`agentproof-${name}.yml`, workflowDirectory), "utf8")),
    ),
  );
  assert.deepEqual(analysis.permissions, { contents: "read", "pull-requests": "read" });
  assert.equal(analysis.jobs.analyze["timeout-minutes"], 15);
  assert.equal(analysis.jobs.analyze.permissions, undefined);
  assert.equal(disposition.jobs.revalidate["timeout-minutes"], 25);
  assert.equal(disposition.jobs["refresh-pull-request"]["timeout-minutes"], 25);
  assert.equal(revalidate.jobs.dispatch["timeout-minutes"], 25);
  assert.equal(revalidate.jobs.dispatch.strategy["max-parallel"], 4);
  for (const permissions of [disposition.permissions, revalidate.jobs.dispatch.permissions]) {
    assert.deepEqual(permissions, {
      actions: "write",
      checks: "write",
      contents: "read",
      "pull-requests": "read",
    });
  }
  assert.equal(publisher.jobs.publish.permissions.actions, "read");
  assert.equal(publisher.jobs.publish.permissions.contents, "read");
  assert.equal(publisher.jobs.publish.concurrency["cancel-in-progress"], false);
  assert.match(publisher.jobs.publish.concurrency.group, /^agentproof-gate-pr-/u);
  assert.deepEqual(Object.keys(publisher.on.workflow_dispatch.inputs), [
    "analysis_run_id",
    "analysis_run_attempt",
  ]);
  assert.match(publisher.jobs.provenance.if, /actor\.id != 41898282/u);
  assert.match(
    publisher.jobs.provenance.if,
    /github\.ref_name == github\.event\.repository\.default_branch/u,
  );
  const analysisSteps = analysis.jobs.analyze.steps;
  assert.equal(analysisSteps[0].with.ref, "${{ github.workflow_sha }}");
  assert.equal(
    analysisSteps.find((step) => step.with?.path === "trusted").with.ref,
    "${{ steps.pr.outputs.base_sha }}",
  );
  for (const job of [
    disposition.jobs.revalidate,
    disposition.jobs["refresh-pull-request"],
    revalidate.jobs.discover,
    revalidate.jobs.dispatch,
  ]) {
    assert.equal(job.steps[0].with.ref, "${{ github.workflow_sha }}");
  }
  const publishSteps = publisher.jobs.publish.steps;
  assert.equal(
    publisher.jobs.publish.env.EXPECTED_WORKFLOW_SHA,
    "${{ needs.provenance.outputs.workflow_sha }}",
  );
  assert.equal(
    publishSteps.find((step) => step.with?.path === "trusted").with.ref,
    "${{ steps.metadata.outputs.base_sha }}",
  );
  assert.ok(
    publishSteps.some(
      (step) =>
        step["working-directory"] === "bootstrap" &&
        step.run.includes("npm run build --workspace @agentproof/evidence-core"),
    ),
  );
  assert.equal(
    publishSteps.find((step) => step.id === "publish").run,
    "node bootstrap/.github/scripts/publish-check.mjs",
  );
  assert.ok(
    publishSteps.some(
      (step) => step.run === "node bootstrap/.github/scripts/collect-dispositions.mjs",
    ),
  );
  assert.match(
    publishSteps.find((step) => step.id === "evaluate").run,
    /^node trusted\/packages\/evidence-cli\/dist\/cli\.js evaluate .*--policy "\$GITHUB_WORKSPACE\/trusted\/policy\/release-policy\.yml"/u,
  );
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

test("analysis resolver separates current workflow bootstrap from immutable old PR policy base", async () => {
  const directory = await mkdtemp(join(tmpdir(), "agentproof-resolver-test-"));
  try {
    for (const eventName of ["pull_request_target", "workflow_dispatch"]) {
      const { repository, pullRequest } = evidenceHandoffFixture();
      const metadataPath = join(directory, `${eventName}-metadata.json`);
      const eventPath = join(directory, `${eventName}-event.json`);
      await writeFile(
        eventPath,
        JSON.stringify(
          eventName === "pull_request_target"
            ? { pull_request: pullRequest }
            : { inputs: { pr_number: "42" } },
        ),
        "utf8",
      );
      const environment = {
        GITHUB_TOKEN: "test-token",
        GITHUB_REPOSITORY: repository.full_name,
        GITHUB_EVENT_NAME: eventName,
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_SHA: eventName === "workflow_dispatch" ? RUN_SHA : BASE_SHA,
        GITHUB_WORKFLOW_SHA: RUN_SHA,
        GITHUB_REF: "refs/heads/main",
        GITHUB_WORKFLOW_REF: `${repository.full_name}/${ANALYSIS_WORKFLOW_PATH}@refs/heads/main`,
        GITHUB_OUTPUT: join(directory, `${eventName}.output`),
        INPUT_PR_NUMBER: "42",
        EXPECTED_HEAD_SHA: HEAD_SHA,
        METADATA_PATH: metadataPath,
      };
      const responses = new Map([
        ["/repos/octo-org/agentproof", repository],
        ["/repos/octo-org/agentproof/pulls/42", pullRequest],
        ["/repos/octo-org/agentproof/git/ref/heads/main", defaultRefFixture(RUN_SHA)],
      ]);
      const request = async (path) => {
        assert.ok(responses.has(path), `Unexpected API path ${path}`);
        return responses.get(path);
      };
      await runWorkflowScript("resolve-pr", environment, request);
      const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
      assert.deepEqual(metadata, evidenceHandoffFixture().metadata);
      pullRequest.head.sha = RUN_SHA;
      await assert.rejects(
        runWorkflowScript("resolve-pr", environment, request),
        /head changed before analysis/,
      );
      pullRequest.head.sha = HEAD_SHA;
      responses.set("/repos/octo-org/agentproof/git/ref/heads/main", defaultRefFixture(HEAD_SHA));
      await assert.rejects(
        runWorkflowScript("resolve-pr", environment, request),
        /workflow revision changed/,
      );
      responses.set("/repos/octo-org/agentproof/git/ref/heads/main", defaultRefFixture(RUN_SHA));
      environment.GITHUB_WORKFLOW_REF = `${repository.full_name}/${ANALYSIS_WORKFLOW_PATH}@refs/heads/feature`;
      await assert.rejects(
        runWorkflowScript("resolve-pr", environment, request),
        /trusted default-branch workflow/,
      );
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("bootstrap handoff retains source-attempt, workflow, controller and immutable PR checks for old bases", async () => {
  const directory = await mkdtemp(join(tmpdir(), "agentproof-metadata-test-"));
  const incoming = join(directory, "incoming");
  await mkdir(incoming);
  try {
    const baseline = evidenceHandoffFixture();
    const metadataPath = join(incoming, "metadata.json");
    const rawPath = join(incoming, "raw-evidence.json");
    await writeFile(metadataPath, JSON.stringify(baseline.metadata), "utf8");
    await writeFile(rawPath, JSON.stringify(baseline.rawEvidence), "utf8");
    const environment = {
      GITHUB_TOKEN: "test-token",
      GITHUB_REPOSITORY: baseline.repository.full_name,
      GITHUB_EVENT_NAME: "workflow_dispatch",
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_OUTPUT: join(directory, "outputs"),
      INCOMING_PATH: incoming,
      METADATA_PATH: metadataPath,
      RAW_EVIDENCE_PATH: rawPath,
      EXPECTED_PR_NUMBER: "42",
      EXPECTED_HEAD_SHA: HEAD_SHA,
      EXPECTED_RUN_ID: "300",
      EXPECTED_RUN_ATTEMPT: "1",
      EXPECTED_ARTIFACT_NAME: baseline.expected.artifactName,
      EXPECTED_WORKFLOW_SHA: RUN_SHA,
    };
    for (const mutate of [
      undefined,
      (state) => {
        state.analysis.run.run_attempt = 2;
      },
      (state) => {
        state.analysis.run.head_sha = BASE_SHA;
      },
      (state) => {
        state.analysis.run.actor.login = "other-bot";
      },
      (state) => {
        state.analysis.run.event = "pull_request_target";
      },
      (state) => {
        state.reference.object.sha = HEAD_SHA;
      },
      (state) => {
        state.handoff.repository.default_branch = "renamed";
      },
      (state) => {
        state.handoff.pullRequest.head.sha = RUN_SHA;
      },
      (state) => {
        state.handoff.pullRequest.base.sha = RUN_SHA;
      },
      (state) => {
        state.handoff.pullRequest.body = "changed during handoff";
      },
      ...["failure", "cancelled", "timed_out"].map((conclusion) => (state) => {
        state.analysis.run.conclusion = conclusion;
      }),
    ]) {
      const state = {
        analysis: controllerAnalysisFixture(RUN_SHA),
        handoff: evidenceHandoffFixture(),
        reference: defaultRefFixture(RUN_SHA),
      };
      mutate?.(state);
      const responses = new Map([
        ["/repos/octo-org/agentproof", state.handoff.repository],
        ["/repos/octo-org/agentproof/pulls/42", state.handoff.pullRequest],
        ["/repos/octo-org/agentproof/git/ref/heads/main", state.reference],
        [
          "/repos/octo-org/agentproof/git/ref/heads/renamed",
          {
            ...state.reference,
            ref: "refs/heads/renamed",
            url: "https://api.github.com/repos/octo-org/agentproof/git/refs/heads/renamed",
          },
        ],
        ["/repos/octo-org/agentproof/actions/runs/300", state.analysis.run],
        [
          "/repos/octo-org/agentproof/actions/workflows/agentproof-analyze.yml",
          state.analysis.workflow,
        ],
      ]);
      const run = () =>
        runWorkflowScript("read-metadata", environment, async (path) => {
          assert.ok(responses.has(path), `Unexpected API path ${path}`);
          return responses.get(path);
        });
      if (mutate) await assert.rejects(run());
      else {
        await run();
        const output = await readFile(environment.GITHUB_OUTPUT, "utf8");
        assert.match(output, new RegExp(`^base_sha=${BASE_SHA}$`, "mu"));
        assert.match(output, new RegExp(`^head_sha=${HEAD_SHA}$`, "mu"));
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

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
