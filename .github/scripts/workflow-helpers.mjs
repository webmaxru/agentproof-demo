import { assertPositiveInteger, assertRepositoryFullName, assertSha } from "./github-api.mjs";

export const ANALYSIS_WORKFLOW_NAME = "AgentProof Analysis";
export const ANALYSIS_WORKFLOW_PATH = ".github/workflows/agentproof-analyze.yml";
export const PUBLISH_WORKFLOW_NAME = "AgentProof Publish";
export const PUBLISH_WORKFLOW_PATH = ".github/workflows/agentproof-publish.yml";
// Adapt this on the protected base, never from PR inputs or repository variables.
export const APPLICATION_PATH = ".";
export const CHECK_NAME = "AgentProof / gate";
export const COMMENT_MARKER = "<!-- agentproof-gate-summary -->";
export const GITHUB_ACTIONS_APP_ID = 15368;
export const GITHUB_ACTIONS_BOT_ID = 41898282;

const RAW_ARTIFACT_PATTERN = /^agentproof-raw-pr-([1-9]\d*)-([0-9a-f]{40})$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const ARTIFACT_DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const MAX_RAW_ARTIFACT_BYTES = 25 * 1024 * 1024;

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sameRepository(left, right) {
  return (
    typeof left === "string" &&
    typeof right === "string" &&
    left.toLowerCase() === right.toLowerCase()
  );
}

function assertHttpsUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be an HTTPS URL`);
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error(`${label} must be an HTTPS URL`);
  }
  return url.href;
}

export function workflowRunUrlFromEnvironment() {
  const serverUrl = assertHttpsUrl(process.env.GITHUB_SERVER_URL, "GITHUB_SERVER_URL").replace(
    /\/$/u,
    "",
  );
  const repository = assertRepositoryFullName(process.env.GITHUB_REPOSITORY, "GITHUB_REPOSITORY");
  const runId = assertPositiveInteger(process.env.GITHUB_RUN_ID, "GITHUB_RUN_ID");
  return `${serverUrl}/${repository}/actions/runs/${runId}`;
}

export function parseRawArtifactName(value) {
  const match = RAW_ARTIFACT_PATTERN.exec(String(value));
  if (match === null) {
    throw new Error("Analysis artifact name is malformed");
  }
  return {
    pullRequestNumber: assertPositiveInteger(match[1], "artifact PR number"),
    headSha: assertSha(match[2], "artifact head SHA"),
  };
}

export function isAgentProofCommandCandidate(body) {
  return (
    typeof body === "string" && /^\/agentproof(?:[ \t]|$)/u.test(body.split(/\r?\n/u, 1)[0] ?? "")
  );
}

export function isTrustedPullRequestAuthor(pullRequest) {
  return ["OWNER", "MEMBER", "COLLABORATOR"].includes(pullRequest?.author_association);
}

export function classifyDispositionEvent(event) {
  const action = event?.action;
  if (!["created", "edited", "deleted"].includes(action)) {
    throw new Error(`Unsupported issue_comment action: ${String(action)}`);
  }

  const currentIsCandidate = isAgentProofCommandCandidate(event.comment?.body);
  const previousBody = event.changes?.body?.from;
  const previousIsCandidate = isAgentProofCommandCandidate(previousBody);

  if (action === "created") {
    return {
      shouldDispatch: currentIsCandidate,
      requiresAuthorization: currentIsCandidate,
      reason: currentIsCandidate ? "new command" : "unrelated comment",
    };
  }
  if (action === "deleted") {
    return {
      shouldDispatch: currentIsCandidate,
      requiresAuthorization: false,
      reason: currentIsCandidate ? "deleted command" : "unrelated comment",
    };
  }
  if (previousIsCandidate) {
    return {
      shouldDispatch: true,
      requiresAuthorization: false,
      reason: currentIsCandidate ? "edited command" : "command edited away",
    };
  }
  if (currentIsCandidate) {
    return {
      shouldDispatch: true,
      requiresAuthorization: previousBody !== undefined,
      reason:
        previousBody === undefined
          ? "conservative edited-command revalidation"
          : "newly edited command",
    };
  }
  return {
    shouldDispatch: false,
    requiresAuthorization: false,
    reason: "unrelated comment",
  };
}

function validateWorkflowRunIdentity({
  run,
  workflow,
  repository,
  expectedRunId,
  expectedRunAttempt,
  name,
  path,
}) {
  const runId = assertPositiveInteger(run?.id, "workflow run id");
  const runAttempt = assertPositiveInteger(run?.run_attempt, "workflow run attempt");
  if (expectedRunId !== undefined) {
    invariant(
      runId === assertPositiveInteger(expectedRunId, "expected workflow run id"),
      "Workflow run ID does not match the exact requested run",
    );
  }
  if (expectedRunAttempt !== undefined) {
    invariant(
      runAttempt === assertPositiveInteger(expectedRunAttempt, "expected workflow run attempt"),
      "Workflow run attempt changed",
    );
  }
  const repositoryId = assertPositiveInteger(repository?.id, "repository id");
  const workflowId = assertPositiveInteger(workflow?.id, "workflow id");
  invariant(
    assertPositiveInteger(run?.workflow_id, "run workflow id") === workflowId,
    "Workflow run was produced by an unexpected workflow",
  );
  invariant(
    workflow?.path === path && run?.path === path,
    "Workflow path is not the protected AgentProof workflow",
  );
  invariant(workflow?.state === "active", "Protected workflow is not active");
  invariant(workflow?.name === name && run?.name === name, "Workflow run name is unexpected");
  invariant(
    assertPositiveInteger(run?.repository?.id, "run repository id") === repositoryId &&
      sameRepository(run?.repository?.full_name, repository?.full_name),
    "Workflow run repository does not match the current repository",
  );
  assertSha(run?.head_sha, "workflow head SHA");
  return { runId, runAttempt };
}

export function isControllerAnalysis(run) {
  return (
    run?.event === "workflow_dispatch" &&
    run?.actor?.id === GITHUB_ACTIONS_BOT_ID &&
    run?.actor?.login === "github-actions[bot]" &&
    run?.actor?.type === "Bot"
  );
}

export function validateAnalysisRunIdentity(options) {
  const identity = validateWorkflowRunIdentity({
    ...options,
    name: ANALYSIS_WORKFLOW_NAME,
    path: ANALYSIS_WORKFLOW_PATH,
  });
  const { run, repository } = options;
  invariant(
    ["pull_request_target", "workflow_dispatch"].includes(run?.event),
    "Workflow run event is not an allowed analysis trigger",
  );
  if (run.event === "workflow_dispatch") {
    invariant(
      run.head_branch === repository.default_branch &&
        run.head_repository?.id === repository.id &&
        sameRepository(run.head_repository?.full_name, repository.full_name),
      "Dispatched analysis did not run from this repository's default branch",
    );
  }
  return identity;
}

export function validateCompletedAnalysisRun(options) {
  const identity = validateAnalysisRunIdentity(options);
  invariant(
    options.run?.status === "completed" && options.run?.conclusion === "success",
    "Only successful completed analysis runs can be published",
  );
  return identity;
}

export function validateNativeAnalysisRun({ run, workflow, repository, artifacts, ...expected }) {
  const { runId, runAttempt } = validateCompletedAnalysisRun({
    run,
    workflow,
    repository,
    ...expected,
  });
  const repositoryId = assertPositiveInteger(repository?.id, "repository id");
  invariant(Array.isArray(artifacts), "Workflow artifacts must be an array");
  invariant(artifacts.length === 1, "Analysis run must contain exactly one raw-evidence artifact");
  const artifact = artifacts[0];
  const artifactId = assertPositiveInteger(artifact?.id, "artifact id");
  invariant(artifact?.expired === false, "Analysis artifact is expired");
  invariant(
    Number.isSafeInteger(artifact?.size_in_bytes) &&
      artifact.size_in_bytes > 0 &&
      artifact.size_in_bytes <= MAX_RAW_ARTIFACT_BYTES,
    "Analysis artifact size is invalid",
  );
  invariant(
    ARTIFACT_DIGEST_PATTERN.test(String(artifact?.digest)),
    "Analysis artifact is missing a valid GitHub digest",
  );
  invariant(
    assertPositiveInteger(artifact?.workflow_run?.id, "artifact workflow run id") === runId,
    "Artifact does not belong to the triggering workflow run",
  );
  invariant(
    assertPositiveInteger(artifact?.workflow_run?.repository_id, "artifact repository id") ===
      repositoryId,
    "Artifact does not belong to the current repository",
  );
  invariant(
    artifact?.workflow_run?.head_branch === run?.head_branch &&
      assertSha(artifact?.workflow_run?.head_sha, "artifact workflow head SHA") ===
        assertSha(run?.head_sha, "workflow head SHA"),
    "Artifact workflow identity does not match the analysis run",
  );

  const parsedName = parseRawArtifactName(artifact?.name);
  if (run.event === "pull_request_target") {
    invariant(
      Array.isArray(run?.pull_requests),
      "Pull-request workflow run is missing pull request identity",
    );
    const matches = run.pull_requests.filter(
      (pullRequest) => pullRequest?.number === parsedName.pullRequestNumber,
    );
    invariant(
      matches.length === 1,
      "Artifact pull request is not uniquely associated with the workflow run",
    );
    const pullRequest = matches[0];
    invariant(
      assertSha(pullRequest?.head?.sha, "workflow PR head SHA") === parsedName.headSha,
      "Artifact head SHA does not match the workflow pull request",
    );
    invariant(
      assertPositiveInteger(pullRequest?.base?.repo?.id, "workflow base repository id") ===
        repositoryId,
      "Workflow pull request targets a different repository",
    );
  }

  return {
    runId,
    runAttempt,
    artifactId,
    artifactName: artifact.name,
    artifactDigest: artifact.digest,
    pullRequestNumber: parsedName.pullRequestNumber,
    headSha: parsedName.headSha,
  };
}

export function validateAnalysisRun({ event, ...options }) {
  invariant(event?.action === "completed", "workflow_run action must be completed");
  const validated = validateNativeAnalysisRun({
    ...options,
    expectedRunId: assertPositiveInteger(event?.workflow_run?.id, "event workflow run id"),
    expectedRunAttempt: assertPositiveInteger(
      event?.workflow_run?.run_attempt,
      "event run attempt",
    ),
  });
  const { run, workflow, repository } = options;
  invariant(
    event.workflow_run.workflow_id === workflow.id &&
      event.workflow_run.name === ANALYSIS_WORKFLOW_NAME &&
      event.workflow_run.event === run.event,
    "Event workflow identity does not match the protected analysis",
  );
  invariant(
    event.workflow_run.status === "completed" && event.workflow_run.conclusion === "success",
    "Event does not describe a successful completed analysis run",
  );
  invariant(
    event.workflow_run.head_branch === run.head_branch &&
      assertSha(event.workflow_run.head_sha, "event workflow head SHA") === run.head_sha,
    "Event and API workflow run revisions do not match",
  );
  invariant(
    event.workflow_run.repository?.id === repository.id &&
      sameRepository(event.workflow_run.repository?.full_name, repository.full_name),
    "Event workflow repository does not match",
  );
  invariant(
    !isControllerAnalysis(run),
    "Controller-dispatched analysis must use explicit publisher dispatch",
  );
  return validated;
}

// Identity only; expectedHeadSha is the trusted workflow revision, not the PR head.
export function validateNativePublisherRun({
  run,
  workflow,
  repository,
  expectedRunId,
  expectedRunAttempt,
  expectedHeadSha,
}) {
  invariant(
    ["workflow_run", "workflow_dispatch"].includes(run?.event),
    "Publisher event is not an allowed trigger",
  );
  const identity = validateWorkflowRunIdentity({
    run,
    workflow,
    repository,
    expectedRunId: assertPositiveInteger(expectedRunId, "publisher run id"),
    expectedRunAttempt: assertPositiveInteger(expectedRunAttempt, "publisher run attempt"),
    name: PUBLISH_WORKFLOW_NAME,
    path: PUBLISH_WORKFLOW_PATH,
  });
  invariant(
    typeof repository.default_branch === "string" &&
      repository.default_branch.length > 0 &&
      run.head_branch === repository.default_branch &&
      run.head_repository?.id === repository.id &&
      sameRepository(run.head_repository?.full_name, repository.full_name),
    "Publisher must run from this repository's protected default branch",
  );
  invariant(
    assertSha(expectedHeadSha, "expected publisher workflow SHA") === run.head_sha,
    "Publisher native run does not match the trusted workflow revision",
  );
  return identity;
}

export function validatePublisherRun({ eventName, event, run, workflow, repository, context }) {
  const identity = validateNativePublisherRun({
    run,
    workflow,
    repository,
    expectedRunId: context.runId,
    expectedRunAttempt: context.runAttempt,
    expectedHeadSha: context.sha,
  });
  invariant(run.event === eventName, "Publisher event does not match the native run");
  const defaultRef = `refs/heads/${repository.default_branch}`;
  invariant(
    context.ref === defaultRef &&
      context.workflowRef === `${repository.full_name}/${PUBLISH_WORKFLOW_PATH}@${defaultRef}`,
    "Publisher context must identify the protected default-branch workflow",
  );
  invariant(
    event?.repository?.id === repository.id &&
      sameRepository(event.repository.full_name, repository.full_name),
    "Publisher event repository does not match",
  );
  return identity;
}

export function validateDispatchedAnalysis({ event, ...options }) {
  invariant(
    event?.inputs !== null &&
      typeof event?.inputs === "object" &&
      JSON.stringify(Object.keys(event.inputs).sort()) ===
        JSON.stringify(["analysis_run_attempt", "analysis_run_id"]),
    "Publisher dispatch inputs must identify exactly one analysis run and attempt",
  );
  const validated = validateNativeAnalysisRun({
    ...options,
    expectedRunId: assertPositiveInteger(
      event.inputs.analysis_run_id,
      "dispatched analysis run id",
    ),
    expectedRunAttempt: assertPositiveInteger(
      event.inputs.analysis_run_attempt,
      "dispatched analysis run attempt",
    ),
  });
  invariant(
    isControllerAnalysis(options.run),
    "Explicit publisher dispatch requires a controller-dispatched analysis",
  );
  return validated;
}

export function validateUnchangedPullRequest({ repository, pullRequest, previous }) {
  const identity = validateLivePullRequest({
    repository,
    pullRequest,
    expectedPullRequestNumber: previous.number,
    expectedHeadSha: previous.head?.sha,
    expectedBaseSha: previous.base?.sha,
  });
  invariant(
    String(pullRequest.body ?? "") === String(previous.body ?? ""),
    "Pull request body changed during revalidation",
  );
  invariant(
    pullRequest.head?.ref === previous.head?.ref &&
      pullRequest.base?.ref === previous.base?.ref &&
      pullRequest.html_url === previous.html_url &&
      pullRequest.user?.login === previous.user?.login &&
      pullRequest.author_association === previous.author_association,
    "Pull request metadata changed during revalidation",
  );
  return identity;
}

export function validateLivePullRequest({
  repository,
  pullRequest,
  expectedPullRequestNumber,
  expectedHeadSha,
  expectedBaseSha,
}) {
  const number = assertPositiveInteger(pullRequest?.number, "live pull request number");
  if (expectedPullRequestNumber !== undefined) {
    invariant(
      number === assertPositiveInteger(expectedPullRequestNumber, "expected PR number"),
      "Live pull request number does not match",
    );
  }
  invariant(pullRequest?.state === "open", `Pull request #${number} is not open`);
  invariant(
    sameRepository(pullRequest?.base?.repo?.full_name, repository?.full_name),
    "Pull request targets a different repository",
  );
  invariant(
    pullRequest?.base?.ref === repository?.default_branch,
    "Pull request does not target the protected default branch",
  );
  const headSha = assertSha(pullRequest?.head?.sha, "live PR head SHA");
  const baseSha = assertSha(pullRequest?.base?.sha, "live PR base SHA");
  invariant(headSha !== baseSha, "Pull request base and head SHAs must differ");
  if (expectedHeadSha !== undefined) {
    invariant(
      headSha === assertSha(expectedHeadSha, "expected head SHA"),
      "Pull request head changed while AgentProof was running",
    );
  }
  if (expectedBaseSha !== undefined) {
    invariant(
      baseSha === assertSha(expectedBaseSha, "expected base SHA"),
      "Pull request base changed while AgentProof was running",
    );
  }
  return { number, headSha, baseSha };
}

export function validateEvidenceHandoff({
  metadata,
  rawEvidence,
  expected,
  repository,
  pullRequest,
}) {
  invariant(
    metadata !== null && typeof metadata === "object" && !Array.isArray(metadata),
    "Metadata must be an object",
  );
  const metadataKeys = [
    "author",
    "authorAssociation",
    "baseRef",
    "baseSha",
    "headRef",
    "headSha",
    "pullRequestBody",
    "pullRequestNumber",
    "pullRequestUrl",
    "repository",
    "schemaVersion",
    ...["appPath", "samplePath"].filter((key) => Object.hasOwn(metadata, key)),
  ];
  invariant(
    JSON.stringify(Object.keys(metadata).sort()) === JSON.stringify(metadataKeys.sort()),
    "Metadata contains missing or unexpected fields",
  );
  invariant(metadata.schemaVersion === "1.0.0", "Metadata schema version is unsupported");
  invariant(
    sameRepository(metadata.repository, repository.full_name),
    "Metadata repository does not match",
  );
  const identity = validateLivePullRequest({
    repository,
    pullRequest,
    expectedPullRequestNumber: expected.pullRequestNumber,
    expectedHeadSha: expected.headSha,
    expectedBaseSha: metadata.baseSha,
  });
  invariant(
    assertPositiveInteger(metadata.pullRequestNumber, "metadata PR number") === identity.number,
    "Metadata pull request number does not match",
  );
  invariant(
    assertSha(metadata.headSha, "metadata head SHA") === identity.headSha,
    "Metadata head SHA does not match",
  );
  invariant(
    metadata.baseRef === pullRequest.base.ref && metadata.headRef === pullRequest.head.ref,
    "Metadata pull request refs do not match live GitHub state",
  );
  invariant(
    metadata.pullRequestUrl === pullRequest.html_url,
    "Metadata pull request URL does not match live GitHub state",
  );
  invariant(
    metadata.pullRequestBody === String(pullRequest.body ?? "").slice(0, 50_000),
    "Pull request body changed after analysis",
  );
  invariant(
    metadata.author === pullRequest.user?.login &&
      metadata.authorAssociation === pullRequest.author_association,
    "Pull request author metadata changed after analysis",
  );
  invariant(
    metadata.appPath === undefined ||
      metadata.samplePath === undefined ||
      metadata.appPath === metadata.samplePath,
    "Metadata application path aliases conflict",
  );
  invariant(
    (metadata.appPath ?? metadata.samplePath) === APPLICATION_PATH,
    "Metadata application path is unexpected",
  );

  invariant(
    rawEvidence !== null && typeof rawEvidence === "object" && !Array.isArray(rawEvidence),
    "Raw evidence must be an object",
  );
  invariant(
    rawEvidence.schemaVersion === "1.0.0" && rawEvidence.documentType === "raw",
    "Raw evidence type or schema version is invalid",
  );
  invariant(
    sameRepository(rawEvidence.repository, repository.full_name) &&
      rawEvidence.pullRequestNumber === identity.number &&
      assertSha(rawEvidence.baseSha, "raw evidence base SHA") === identity.baseSha &&
      assertSha(rawEvidence.headSha, "raw evidence head SHA") === identity.headSha,
    "Raw evidence identity does not match metadata and live GitHub state",
  );
  invariant(
    SHA256_PATTERN.test(String(rawEvidence.artifact?.sha256)),
    "Raw evidence digest is invalid",
  );
  const serverUrl = assertHttpsUrl(expected.serverUrl, "GitHub server URL").replace(/\/$/u, "");
  const runId = assertPositiveInteger(expected.runId, "expected workflow run id");
  invariant(
    rawEvidence.artifact?.workflowRunUrl ===
      `${serverUrl}/${repository.full_name}/actions/runs/${runId}`,
    "Raw evidence does not identify the triggering analysis workflow run",
  );
  invariant(
    expected.artifactName === `agentproof-raw-pr-${identity.number}-${identity.headSha}`,
    "Downloaded artifact name does not match its evidence identity",
  );
  return identity;
}

export function isGitHubActionsCheckRun(checkRun) {
  return checkRun?.name === CHECK_NAME && checkRun?.app?.id === GITHUB_ACTIONS_APP_ID;
}

export function isAgentProofSummaryComment(comment) {
  return (
    typeof comment?.body === "string" &&
    comment.body.startsWith(COMMENT_MARKER) &&
    comment?.user?.id === GITHUB_ACTIONS_BOT_ID &&
    comment?.user?.login === "github-actions[bot]" &&
    comment?.user?.type === "Bot"
  );
}

export function buildPendingCheckPayload({ headSha, detailsUrl, now, reason }) {
  return {
    name: CHECK_NAME,
    head_sha: assertSha(headSha, "pending check head SHA"),
    status: "in_progress",
    started_at: new Date(now).toISOString(),
    details_url: assertHttpsUrl(detailsUrl, "pending check details URL"),
    output: {
      title: "AgentProof revalidation is pending",
      summary: `The gate is fail-closed while AgentProof revalidates after ${reason}.`,
    },
  };
}

export function buildCompletedCheckPayload({
  headSha,
  conclusion,
  detailsUrl,
  now,
  title,
  summary,
}) {
  invariant(
    conclusion === "success" || conclusion === "failure",
    "Check conclusion must be success or failure",
  );
  const shared = {
    status: "completed",
    conclusion,
    completed_at: new Date(now).toISOString(),
    details_url: assertHttpsUrl(detailsUrl, "check details URL"),
    output: { title, summary },
  };
  return {
    create: {
      name: CHECK_NAME,
      head_sha: assertSha(headSha, "check head SHA"),
      ...shared,
    },
    update: shared,
  };
}

export function sanitizeMarkdownCell(value, maximumLength = 180) {
  return String(value)
    .replace(/[\0-\x1f\x7f]/gu, " ")
    .replaceAll("@", "@\u200b")
    .replaceAll("|", "\\|")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, maximumLength);
}

export function truncateUtf8(value, maximumBytes) {
  const text = String(value);
  if (Buffer.byteLength(text, "utf8") <= maximumBytes) {
    return text;
  }
  let end = Math.min(text.length, maximumBytes);
  while (end > 0 && Buffer.byteLength(text.slice(0, end), "utf8") > maximumBytes) {
    end -= 1;
  }
  return text.slice(0, end);
}

export function validateRulesetPayload(payload) {
  invariant(payload?.target === "branch", "Ruleset target must be branch");
  invariant(payload?.enforcement === "active", "Ruleset must be active");
  invariant(
    payload?.conditions?.ref_name?.include?.includes("~DEFAULT_BRANCH"),
    "Ruleset must target the default branch",
  );
  invariant(
    Array.isArray(payload?.bypass_actors) && payload.bypass_actors.length === 0,
    "Ruleset must not grant an implicit bypass",
  );
  const rules = new Map((payload?.rules ?? []).map((rule) => [rule.type, rule]));
  invariant(rules.has("deletion"), "Ruleset must prevent deletion");
  invariant(rules.has("non_fast_forward"), "Ruleset must prevent force pushes");
  const pullRequest = rules.get("pull_request")?.parameters;
  invariant(
    pullRequest?.required_approving_review_count >= 1 &&
      pullRequest?.dismiss_stale_reviews_on_push === true &&
      pullRequest?.require_code_owner_review === true &&
      pullRequest?.require_last_push_approval === true &&
      pullRequest?.required_review_thread_resolution === true,
    "Ruleset pull-request protections are incomplete",
  );
  const checks = rules.get("required_status_checks")?.parameters;
  invariant(
    checks?.strict_required_status_checks_policy === true &&
      checks?.do_not_enforce_on_create === false,
    "Ruleset status-check protections are incomplete",
  );
  const requiredChecks = new Map(
    (checks?.required_status_checks ?? []).map((check) => [check.context, check.integration_id]),
  );
  for (const name of [CHECK_NAME, "Build, lint, and test"]) {
    invariant(
      requiredChecks.get(name) === GITHUB_ACTIONS_APP_ID,
      `${name} must be required from GitHub Actions`,
    );
  }
  return payload;
}
