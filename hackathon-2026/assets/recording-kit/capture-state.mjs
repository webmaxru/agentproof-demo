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

export function validateCapturedPublisher(
  {
    run,
    workflow,
    repository: repositoryData,
    runId,
    runAttempt,
    baseSha,
    workflowRunUrl,
    conclusion,
  },
  validateNativePublisherRun,
) {
  assert(
    typeof validateNativePublisherRun === "function",
    "Protected base lacks the native Publisher validator. This candidate helper requires human rollout; use the reviewed b44e2e892945b6cecbbe6e08c8f8d8c2a3b04e6b kit for the legacy installed base.",
  );
  const identity = validateNativePublisherRun({
    run,
    workflow,
    repository: repositoryData,
    expectedRunId: runId,
    expectedRunAttempt: runAttempt,
    expectedHeadSha: baseSha,
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

async function capture(prNumber) {
  const viewer = api("user");
  assert(
    viewer.login === "webmaxru" && viewer.type === "User",
    "Expected the webmaxru human account in the local GitHub keyring.",
  );
  const prefix = `repos/${repository}`;
  const repositoryData = api(prefix);
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
  const checks = api(`${prefix}/commits/${headSha}/check-runs?per_page=100`, true)
    .flatMap((page) => page.check_runs)
    .filter((check) => check.name === "AgentProof / gate" && check.app?.id === 15368)
    .sort((left, right) => right.id - left.id);
  const check = checks[0];
  assert(
    check?.status === "completed",
    "No completed current-head AgentProof / gate. Wait for Analysis/Publish.",
  );
  assert(
    ["success", "failure"].includes(check.conclusion),
    "Gate is not a completed evidence result.",
  );
  assert(check.head_sha === headSha, "Check does not describe the current head.");
  const publisherLinks = [
    ...(check.output?.summary ?? "").matchAll(
      /^\[Workflow run\]\((https:\/\/github\.com\/webmaxru\/agentproof-demo\/actions\/runs\/([1-9]\d*))\)$/gmu,
    ),
  ];
  assert(publisherLinks.length === 1, "Expected one unambiguous publisher link in the check.");
  const [, workflowRunUrl, runId] = publisherLinks[0];
  assert(
    check.details_url === workflowRunUrl ||
      check.details_url === `https://github.com/${repository}/runs/${check.id}`,
    "Check is not linked to this repository's publisher workflow or native check page.",
  );
  const run = api(`${prefix}/actions/runs/${runId}`);
  const publisherWorkflowPath = `${prefix}/actions/workflows/agentproof-publish.yml`;
  const publisherWorkflow = api(publisherWorkflowPath);
  const corePath = join(root, "packages", "evidence-core", "dist", "index.js");
  const trustedHead = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  assert(
    trustedHead.status === 0 && trustedHead.stdout.trim() === baseSha,
    "Run this helper from a trusted checkout of the current PR BASE, not the untrusted PR head.",
  );
  const trustedChanges = spawnSync(
    "git",
    ["status", "--porcelain", "--", ".", ":(exclude)hackathon-2026/assets/recording-kit"],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  assert(
    trustedChanges.status === 0 && trustedChanges.stdout.trim() === "",
    "The base checkout has changes outside the reviewed recording kit. Use a clean base checkout.",
  );
  const validators = await import(
    pathToFileURL(join(root, ".github", "scripts", "workflow-helpers.mjs")).href
  );
  const publisherIdentity = validateCapturedPublisher(
    {
      run,
      workflow: publisherWorkflow,
      repository: repositoryData,
      runId,
      runAttempt: run.run_attempt,
      baseSha,
      workflowRunUrl,
      conclusion: check.conclusion,
    },
    validators.validateNativePublisherRun,
  );
  assert(
    typeof validators.validateUnchangedPullRequest === "function",
    "Protected base lacks the current subject validator; complete the human-controlled rollout.",
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
  assert(
    artifact.size_in_bytes > 0 &&
      artifact.size_in_bytes <= 25 * 1024 * 1024 &&
      artifact.workflow_run?.id === publisherIdentity.runId &&
      artifact.workflow_run?.repository_id === repositoryData.id &&
      artifact.workflow_run?.head_branch === repositoryData.default_branch &&
      artifact.workflow_run?.head_sha === baseSha,
    "Final artifact size or native Publisher provenance is invalid.",
  );
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
  gh(["run", "download", runId, "--repo", repository, "--name", artifactName, "--dir", downloaded]);
  const evidencePath = join(downloaded, "final-evidence.json");
  const stats = await lstat(evidencePath);
  assert(
    stats.isFile() && !stats.isSymbolicLink() && stats.size <= 10 * 1024 * 1024,
    "Downloaded evidence is not a bounded regular file.",
  );
  const evidence = core.parseAndVerifyEvidence(JSON.parse(await readFile(evidencePath, "utf8")));
  assert(evidence.documentType === "final", "Expected final, not raw or advisory evidence.");
  assert(
    evidence.repository.toLowerCase() === repository.toLowerCase() &&
      evidence.pullRequestNumber === prNumber &&
      evidence.headSha === headSha &&
      evidence.baseSha === baseSha &&
      evidence.policy.path === "policy/release-policy.yml" &&
      evidence.policy.baseSha === baseSha,
    "Final evidence subject mismatch.",
  );
  assert(
    evidence.artifact.workflowRunUrl === workflowRunUrl,
    "Evidence names another workflow run.",
  );
  assert(
    evidence.gate.conclusion === check.conclusion,
    "Check and evidence gate conclusions disagree.",
  );
  assert(
    evidence.gate.validUntil === null || Date.parse(evidence.gate.validUntil) > Date.now(),
    "Evidence validity horizon has expired; obtain fresh evidence before recording.",
  );
  assert(
    (check.output?.summary ?? "").includes(evidence.artifact.sha256),
    "Check summary does not reference the canonical evidence digest.",
  );
  const policyContent = api(`${prefix}/contents/${evidence.policy.path}?ref=${baseSha}`);
  assert(
    policyContent.encoding === "base64" && policyContent.size <= 256 * 1024,
    "Protected policy response is malformed or too large.",
  );
  const policy = core.loadReleasePolicyYaml(
    Buffer.from(policyContent.content, "base64").toString("utf8"),
  );
  assert(
    core.canonicalSha256(policy) === evidence.policy.sha256,
    "Protected base policy digest mismatch.",
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
  validators.validateUnchangedPullRequest({
    repository: latestRepository,
    pullRequest: live,
    previous: pr,
  });
  assert(
    live.state === "open" &&
      live.head.sha === headSha &&
      live.base.sha === baseSha &&
      live.updated_at === pr.updated_at,
    "PR changed during capture. Discard the download and run again.",
  );
  validateCapturedPublisher(
    {
      run: api(`${prefix}/actions/runs/${runId}`),
      workflow: api(publisherWorkflowPath),
      repository: latestRepository,
      runId: publisherIdentity.runId,
      runAttempt: publisherIdentity.runAttempt,
      baseSha,
      workflowRunUrl,
      conclusion: check.conclusion,
    },
    validators.validateNativePublisherRun,
  );
  const latestCheck = api(`${prefix}/check-runs/${check.id}`);
  assert(
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
    publisherWorkflowSha: run.head_sha,
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
      "GitHub archive digest and canonical JSON evidence digest are different values.",
      "Native Publisher identity is verified; this snapshot does not independently expose dispatch inputs or prove the automatic bot handoff.",
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
      "node capture-state.mjs --pr <number>\nRead-only current-SHA artifact capture. Writes only ignored .agentproof/recording output.\nUses the existing webmaxru keyring login; never posts, dispatches, approves, accepts, or merges.",
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
