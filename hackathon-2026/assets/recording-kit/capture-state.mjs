import { spawnSync } from "node:child_process";
import { access, lstat, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repository = "webmaxru/agentproof-demo";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const environment = { ...process.env };
delete environment.GH_TOKEN;
delete environment.GITHUB_TOKEN;
delete environment.GH_HOST;
delete environment.GH_REPO;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function gh(args) {
  const result = spawnSync("gh", args, {
    cwd: root,
    env: environment,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 120_000,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  assert(
    result.status === 0,
    `Read-only GitHub command failed: ${(result.stderr || "unknown error").slice(0, 1200)}`,
  );
  return result.stdout;
}

function api(path, paginate = false) {
  return JSON.parse(
    gh([
      "api",
      "--method",
      "GET",
      "--hostname",
      "github.com",
      "--header",
      "X-GitHub-Api-Version: 2026-03-10",
      ...(paginate ? ["--paginate", "--slurp"] : []),
      path,
    ]),
  );
}

function commitSha(value, label) {
  assert(typeof value === "string" && /^[0-9a-f]{40}$/u.test(value), `${label} is not a full SHA.`);
  return value;
}

export function validateCaptureCheckout({ repository: repositoryData, branch, headSha, changes }) {
  assert(
    typeof repositoryData?.default_branch === "string" &&
      repositoryData.default_branch.length > 0 &&
      branch?.name === repositoryData.default_branch &&
      branch?.protected === true,
    "The native default branch must still be protected.",
  );
  const workflowSha = commitSha(branch.commit?.sha, "Protected default-branch workflow revision");
  assert(
    headSha === workflowSha,
    "Run this helper from a trusted checkout of the current protected DEFAULT-BRANCH workflow revision, not the PR head or frozen policy base.",
  );
  assert(
    changes === "",
    "The trusted checkout has changes outside the reviewed recording kit. Use a clean protected-default checkout.",
  );
  return workflowSha;
}

export function validateCapturedCheck({ check, repository: repositoryData, headSha }) {
  assert(
    check?.name === "AgentProof / gate" &&
      check.app?.id === 15368 &&
      Number.isSafeInteger(check.id) &&
      check.id > 0 &&
      check.head_sha === headSha,
    "Check is not the native GitHub Actions gate for the current head.",
  );
  assert(
    check.status === "completed" && ["success", "failure"].includes(check.conclusion),
    "No completed current-head evidence result. Wait for Analysis/Publish.",
  );
  const summary = check.output?.summary;
  assert(typeof summary === "string", "The native gate has no summary.");
  const header =
    /^\*\*Result:\*\* (PASS|BLOCKED)\n\n- \*\*Head SHA:\*\* `([0-9a-f]{40})`\n- \*\*Policy digest:\*\* `([0-9a-f]{64})`\n- \*\*Evidence digest:\*\* `([0-9a-f]{64})`\n/u.exec(
      summary,
    );
  const footer =
    /\n\n\[Workflow run\]\((https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/actions\/runs\/([1-9]\d*))\)$/u.exec(
      summary,
    );
  assert(
    header !== null &&
      header[1] === (check.conclusion === "success" ? "PASS" : "BLOCKED") &&
      header[2] === headSha &&
      footer !== null &&
      [...summary.matchAll(/\[Workflow run\]/gu)].length === 1,
    "Expected the exact native gate header and one unambiguous trailing Publisher footer.",
  );
  const workflowRunUrl = footer[1];
  const runId = Number(footer[2]);
  assert(
    Number.isSafeInteger(runId) &&
      workflowRunUrl === `https://github.com/${repositoryData.full_name}/actions/runs/${runId}` &&
      (check.details_url === workflowRunUrl ||
        check.details_url === `https://github.com/${repositoryData.full_name}/runs/${check.id}`),
    "Check is not linked to this repository's Publisher or exact native check page.",
  );
  return {
    runId,
    workflowRunUrl,
    policyDigest: header[3],
    evidenceDigest: header[4],
  };
}

export function validateCapturedPublisher(
  {
    run,
    workflow,
    repository: repositoryData,
    runId,
    runAttempt,
    workflowSha,
    workflowRunUrl,
    conclusion,
  },
  validateNativePublisherRun,
) {
  assert(
    typeof validateNativePublisherRun === "function",
    "Protected orchestration checkout lacks the native Publisher validator; complete the human-controlled rollout.",
  );
  const identity = validateNativePublisherRun({
    run,
    workflow,
    repository: repositoryData,
    expectedRunId: runId,
    expectedRunAttempt: runAttempt,
    expectedHeadSha: workflowSha,
  });
  assert(
    ["success", "failure"].includes(conclusion) &&
      run.html_url === workflowRunUrl &&
      run.status === "completed" &&
      run.conclusion === conclusion,
    "Publisher URL, completion state, or conclusion does not match the native gate.",
  );
  return identity;
}

export function validateCapturedArtifact({
  artifact,
  artifactName,
  publisherIdentity,
  repository: repositoryData,
  workflowSha,
}) {
  assert(
    Number.isSafeInteger(artifact?.id) &&
      artifact.id > 0 &&
      artifact.name === artifactName &&
      artifact.expired === false &&
      Number.isSafeInteger(artifact.size_in_bytes) &&
      artifact.size_in_bytes > 0 &&
      artifact.size_in_bytes <= 25 * 1024 * 1024 &&
      /^sha256:[0-9a-f]{64}$/u.test(artifact.digest) &&
      artifact.workflow_run?.id === publisherIdentity.runId &&
      artifact.workflow_run?.repository_id === repositoryData.id &&
      artifact.workflow_run?.head_branch === repositoryData.default_branch &&
      artifact.workflow_run?.head_sha === workflowSha,
    "Final artifact digest, size, or native Publisher provenance is invalid.",
  );
}

export function validateCapturedEvidence(
  {
    input,
    repository: repositoryData,
    prNumber,
    headSha,
    baseSha,
    check,
    policy,
    now = Date.now(),
  },
  core,
) {
  const evidence = core.parseAndVerifyEvidence(input);
  const checkIdentity = validateCapturedCheck({ check, repository: repositoryData, headSha });
  assert(evidence.documentType === "final", "Expected final, not raw or advisory evidence.");
  assert(
    evidence.repository.toLowerCase() === repositoryData.full_name.toLowerCase() &&
      evidence.pullRequestNumber === prNumber &&
      evidence.headSha === headSha &&
      evidence.baseSha === baseSha &&
      evidence.policy.path === "policy/release-policy.yml" &&
      evidence.policy.baseSha === baseSha,
    "Final evidence subject mismatch.",
  );
  assert(
    evidence.artifact.workflowRunUrl === checkIdentity.workflowRunUrl &&
      evidence.artifact.sha256 === checkIdentity.evidenceDigest &&
      evidence.policy.sha256 === checkIdentity.policyDigest,
    "Native check and evidence Publisher or canonical digests disagree.",
  );
  assert(
    evidence.gate.conclusion === check.conclusion,
    "Check and evidence gate conclusions disagree.",
  );
  assert(
    evidence.gate.validUntil === null || Date.parse(evidence.gate.validUntil) > now,
    "Evidence validity horizon has expired; obtain fresh evidence before recording.",
  );
  assert(
    core.canonicalSha256(policy) === evidence.policy.sha256 &&
      policy.version === evidence.policy.version,
    "Protected PR-base policy digest or version mismatch.",
  );
  return evidence;
}

export function validateCapturedSubject(
  { repository: repositoryData, pullRequest, previous },
  validateUnchangedPullRequest,
) {
  assert(
    repositoryData.id === previous.repository.id &&
      repositoryData.full_name === previous.repository.full_name &&
      repositoryData.default_branch === previous.repository.default_branch &&
      pullRequest.base?.repo?.id === repositoryData.id,
    "Native repository or default branch changed during capture.",
  );
  validateUnchangedPullRequest({
    repository: repositoryData,
    pullRequest,
    previous: previous.pullRequest,
  });
  assert(
    pullRequest.updated_at === previous.pullRequest.updated_at,
    "PR changed during capture. Discard the download and run again.",
  );
}

function trustedCheckout(repositoryData, branch) {
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  const changes = spawnSync(
    "git",
    ["status", "--porcelain", "--", ".", ":(exclude)hackathon-2026/assets/recording-kit"],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  assert(head.status === 0 && changes.status === 0, "Cannot verify the trusted Git checkout.");
  return validateCaptureCheckout({
    repository: repositoryData,
    branch,
    headSha: head.stdout.trim(),
    changes: changes.stdout.trim(),
  });
}

function currentGate(prefix, headSha) {
  return api(`${prefix}/commits/${headSha}/check-runs?per_page=100`, true)
    .flatMap((page) => page.check_runs)
    .filter((check) => check.name === "AgentProof / gate" && check.app?.id === 15368)
    .sort((left, right) => right.id - left.id)[0];
}

async function capture(prNumber) {
  const viewer = api("user");
  assert(
    viewer.login === "webmaxru" && viewer.type === "User",
    "Expected the webmaxru human account in the local GitHub keyring.",
  );
  const prefix = `repos/${repository}`;
  const repositoryData = api(prefix);
  assert(
    repositoryData.full_name.toLowerCase() === repository.toLowerCase(),
    "Native repository identity changed.",
  );
  const branchPath = `${prefix}/branches/${encodeURIComponent(repositoryData.default_branch)}`;
  const workflowSha = trustedCheckout(repositoryData, api(branchPath));
  const validators = await import(
    pathToFileURL(join(root, ".github", "scripts", "workflow-helpers.mjs")).href
  );
  assert(
    typeof validators.resolveTrustedWorkflowRevision === "function" &&
      typeof validators.validateUnchangedPullRequest === "function",
    "Protected orchestration checkout lacks the old-base handoff validators; complete the human-controlled rollout. A legacy recording kit cannot verify this candidate path.",
  );
  const readNative = (path, options) => {
    assert(
      options?.method === undefined || options.method === "GET",
      "Recording validation permits only native GET requests.",
    );
    return api(path.replace(/^\//u, ""));
  };
  await validators.resolveTrustedWorkflowRevision(
    { repository: repositoryData, expectedSha: workflowSha },
    readNative,
  );
  const pr = api(`${prefix}/pulls/${prNumber}`);
  assert(pr.state === "open", "The recording PR must still be open.");
  assert(
    pr.base.repo.full_name.toLowerCase() === repository.toLowerCase() &&
      pr.base.repo.id === repositoryData.id &&
      pr.base.ref === repositoryData.default_branch,
    "PR repository mismatch.",
  );
  const headSha = commitSha(pr.head.sha, "PR head");
  const baseSha = commitSha(pr.base.sha, "PR base");
  assert(baseSha !== headSha, "The PR base and head must be distinct commits.");
  const check = currentGate(prefix, headSha);
  const { workflowRunUrl, runId } = validateCapturedCheck({
    check,
    repository: repositoryData,
    headSha,
  });
  const run = api(`${prefix}/actions/runs/${runId}`);
  const publisherWorkflowPath = `${prefix}/actions/workflows/agentproof-publish.yml`;
  const publisherWorkflow = api(publisherWorkflowPath);
  const corePath = join(root, "packages", "evidence-core", "dist", "index.js");
  const publisherIdentity = validateCapturedPublisher(
    {
      run,
      workflow: publisherWorkflow,
      repository: repositoryData,
      runId,
      runAttempt: run.run_attempt,
      workflowSha,
      workflowRunUrl,
      conclusion: check.conclusion,
    },
    validators.validateNativePublisherRun,
  );
  const artifactName = `agentproof-evidence-pr-${prNumber}-${headSha}`;
  const artifacts = api(`${prefix}/actions/runs/${runId}/artifacts?per_page=100`, true)
    .flatMap((page) => page.artifacts)
    .filter((artifact) => artifact.name === artifactName && !artifact.expired);
  assert(
    artifacts.length === 1,
    "Expected exactly one unexpired final artifact from this publisher run.",
  );
  const artifact = artifacts[0];
  validateCapturedArtifact({
    artifact,
    artifactName,
    publisherIdentity,
    repository: repositoryData,
    workflowSha,
  });
  await access(corePath).catch(() => {
    throw new Error(
      "Build the repository with npm run build first. This helper never installs or executes PR code.",
    );
  });
  const core = await import(pathToFileURL(corePath).href);
  const outputRoot = join(root, ".agentproof", "recording");
  await mkdir(outputRoot, { recursive: true });
  const output = await mkdtemp(join(outputRoot, `pr-${prNumber}-${headSha.slice(0, 12)}-`));
  const downloaded = join(output, "download");
  gh([
    "run",
    "download",
    String(runId),
    "--repo",
    repository,
    "--name",
    artifactName,
    "--dir",
    downloaded,
  ]);
  const evidencePath = join(downloaded, "final-evidence.json");
  const stats = await lstat(evidencePath);
  assert(
    stats.isFile() && !stats.isSymbolicLink() && stats.size <= 10 * 1024 * 1024,
    "Downloaded evidence is not a bounded regular file.",
  );
  const policyContent = api(`${prefix}/contents/policy/release-policy.yml?ref=${baseSha}`);
  assert(
    policyContent.encoding === "base64" && policyContent.size <= 256 * 1024,
    "Protected policy response is malformed or too large.",
  );
  const policy = core.loadReleasePolicyYaml(
    Buffer.from(policyContent.content, "base64").toString("utf8"),
  );
  const evidence = validateCapturedEvidence(
    {
      input: JSON.parse(await readFile(evidencePath, "utf8")),
      repository: repositoryData,
      prNumber,
      headSha,
      baseSha,
      check,
      policy,
    },
    core,
  );
  const unresolved = new Set(evidence.gate.unresolvedFindingIds);
  const permission = api(`${prefix}/collaborators/webmaxru/permission`);
  const eligibleFindings = evidence.findings.filter(
    (finding) =>
      unresolved.has(finding.id) &&
      finding.exceptionable &&
      finding.severity !== "critical" &&
      policy.exceptions.allowedFindingStates.includes(finding.state) &&
      core.SEVERITIES.indexOf(finding.severity) <=
        core.SEVERITIES.indexOf(policy.exceptions.maximumSeverity),
  );
  const live = api(`${prefix}/pulls/${prNumber}`);
  const latestRepository = api(prefix);
  validateCapturedSubject(
    {
      repository: latestRepository,
      pullRequest: live,
      previous: { repository: repositoryData, pullRequest: pr },
    },
    validators.validateUnchangedPullRequest,
  );
  assert(
    trustedCheckout(latestRepository, api(branchPath)) === workflowSha,
    "Protected repository or workflow revision changed during capture. Discard the download.",
  );
  await validators.resolveTrustedWorkflowRevision(
    { repository: latestRepository, expectedSha: workflowSha },
    readNative,
  );
  validateCapturedPublisher(
    {
      run: api(`${prefix}/actions/runs/${runId}`),
      workflow: api(publisherWorkflowPath),
      repository: latestRepository,
      runId: publisherIdentity.runId,
      runAttempt: publisherIdentity.runAttempt,
      workflowSha,
      workflowRunUrl,
      conclusion: check.conclusion,
    },
    validators.validateNativePublisherRun,
  );
  const latestArtifact = api(`${prefix}/actions/artifacts/${artifact.id}`);
  validateCapturedArtifact({
    artifact: latestArtifact,
    artifactName,
    publisherIdentity,
    repository: latestRepository,
    workflowSha,
  });
  assert(
    latestArtifact.id === artifact.id &&
      latestArtifact.digest === artifact.digest &&
      latestArtifact.size_in_bytes === artifact.size_in_bytes &&
      latestArtifact.created_at === artifact.created_at &&
      latestArtifact.updated_at === artifact.updated_at,
    "The final artifact changed during capture. Discard the download and run again.",
  );
  const latestCheck = currentGate(prefix, headSha);
  validateCapturedCheck({ check: latestCheck, repository: latestRepository, headSha });
  assert(
    latestCheck.id === check.id &&
      latestCheck.status === "completed" &&
      latestCheck.conclusion === check.conclusion &&
      latestCheck.completed_at === check.completed_at &&
      latestCheck.output?.summary === check.output?.summary,
    "The gate changed during capture. Discard the download and run again.",
  );
  const snapshot = {
    status: "VERIFIED_READ_ONLY_SNAPSHOT_NOT_APPROVAL",
    capturedAt: new Date().toISOString(),
    repository,
    pullRequestNumber: prNumber,
    baseSha,
    headSha,
    checkUrl: check.html_url,
    workflowRunUrl,
    publisherEvent: run.event,
    publisherRunAttempt: publisherIdentity.runAttempt,
    publisherWorkflowSha: workflowSha,
    protectedOrchestrationSha: workflowSha,
    artifactName,
    artifactId: artifact.id,
    githubArchiveDigest: artifact.digest ?? null,
    canonicalEvidenceSha256: evidence.artifact.sha256,
    protectedPolicySha256: evidence.policy.sha256,
    gate: evidence.gate,
    findings: evidence.findings.map(({ id, state, severity, exceptionable }) => ({
      id,
      state,
      severity,
      exceptionable,
    })),
    proposedHuman: { login: viewer.login, repositoryPermission: permission.permission },
    policyEligibleFindingIds: eligibleFindings.map((finding) => finding.id),
    rules: {
      authorizedMinimumPermission: policy.exceptions.authorizedMinimumPermission,
      minimumRationaleLength: policy.exceptions.minimumRationaleLength,
      maximumDurationDays: policy.exceptions.maximumDurationDays,
    },
    limitations: [
      "This read-only snapshot is not a disposition, approval, live canary, or privacy sign-off.",
      "The local keyring account's permission is recorded, not treated as a submitted decision.",
      "Re-resolve head, comments, permissions, eligibility and expiry immediately before any HUMAN submission.",
      "GitHub archive digest is recorded native metadata; the canonical JSON evidence digest is independently verified.",
      "Native Publisher identity is verified; this snapshot does not independently expose dispatch inputs or prove the automatic bot handoff.",
      "The protected orchestration revision and immutable PR/policy base are independent trust anchors.",
      "Use current native rules and a distinct authorized human code owner; a draft-disabled Merge button is not enforcement proof.",
    ],
  };
  await writeFile(
    join(output, "presenter-state.json"),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  );
  const drafts = eligibleFindings.map((finding) =>
    [
      `Finding: ${finding.id} (${finding.state})`,
      `/agentproof accept-exception ${finding.id}`,
      `sha: ${headSha}`,
      "reason: <HUMAN_MUST_ENTER_SPECIFIC_RATIONALE>",
      "expires: <HUMAN_MUST_SELECT_VALID_YYYY-MM-DD>",
    ].join("\n"),
  );
  await writeFile(
    join(output, "human-decision-skeletons.txt"),
    [
      "DRAFT ONLY - NOT SUBMITTED - PLACEHOLDERS ARE INTENTIONALLY INVALID",
      "Never paste this file wholesale into GitHub. Only an authorized human may",
      "verify a current eligible finding and submit the exact four-line command.",
      "No existing acceptance, independent review, or approval is asserted here.",
      "",
      ...(drafts.length ? drafts : ["No current policy-eligible unresolved finding was found."]),
      "",
    ].join("\n\n"),
    "utf8",
  );
  console.log(
    JSON.stringify(
      {
        status: snapshot.status,
        repository,
        pullRequestNumber: prNumber,
        headSha,
        conclusion: evidence.gate.conclusion,
        output,
      },
      null,
      2,
    ),
  );
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log(
      "node capture-state.mjs --pr <number>\nRead-only current-SHA artifact capture from the current protected default-branch checkout; the PR policy base may be older.\nWrites only ignored .agentproof/recording output. Uses the existing webmaxru keyring login; never posts, dispatches, approves, accepts, or merges.",
    );
  } else if (
    args.length !== 2 ||
    args[0] !== "--pr" ||
    !/^[1-9]\d*$/u.test(args[1]) ||
    !Number.isSafeInteger(Number(args[1]))
  ) {
    console.error("Usage: node capture-state.mjs --pr <positive-safe-integer>");
    process.exitCode = 1;
  } else {
    await capture(Number(args[1])).catch((error) => {
      console.error(`Recording capture rejected: ${error.message}`);
      process.exitCode = 1;
    });
  }
}
