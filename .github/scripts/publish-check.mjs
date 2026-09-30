import { readFile } from "node:fs/promises";
import { parseFinalEvidence, verifyArtifactDigest } from "@agentproof/evidence-core";
import {
  assertPositiveInteger,
  assertSha,
  githubPaginate,
  githubRequest,
  repositoryFromEnvironment,
  setOutput,
} from "./github-api.mjs";
import {
  buildCompletedCheckPayload,
  CHECK_NAME,
  COMMENT_MARKER,
  isAgentProofSummaryComment,
  isGitHubActionsCheckRun,
  sanitizeMarkdownCell,
  truncateUtf8,
  validateLivePullRequest,
  workflowRunUrlFromEnvironment,
} from "./workflow-helpers.mjs";

const evidencePath = process.env.EVIDENCE_PATH;
if (!evidencePath) {
  throw new Error("EVIDENCE_PATH is required");
}

const evidence = parseFinalEvidence(JSON.parse(await readFile(evidencePath, "utf8")));
verifyArtifactDigest(evidence);
const repository = repositoryFromEnvironment();
if (evidence.repository !== repository.fullName) {
  throw new Error(
    `Evidence repository ${String(evidence.repository)} does not match ${repository.fullName}`,
  );
}
const pullRequestNumber = assertPositiveInteger(evidence.pullRequestNumber, "pull request number");
const headSha = assertSha(evidence.headSha, "head SHA");
const baseSha = assertSha(evidence.baseSha, "base SHA");
const prefix = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;

async function requireCurrentPullRequest() {
  const [repositoryData, pullRequest] = await Promise.all([
    githubRequest(prefix),
    githubRequest(`${prefix}/pulls/${pullRequestNumber}`),
  ]);
  validateLivePullRequest({
    repository: repositoryData,
    pullRequest,
    expectedPullRequestNumber: pullRequestNumber,
    expectedHeadSha: headSha,
    expectedBaseSha: baseSha,
  });
}

await requireCurrentPullRequest();

const rawConclusion = evidence.gate.conclusion;
const passed = rawConclusion === "success";
const conclusion = passed ? "success" : "failure";
const findings = evidence.findings;
const unresolved = evidence.gate.unresolvedFindingIds;

const counts = findings.reduce(
  (result, finding) => {
    const state = String(finding.state ?? "unknown").toLowerCase();
    if (Object.hasOwn(result, state)) {
      result[state] += 1;
    }
    return result;
  },
  { pass: 0, fail: 0, unknown: 0, exception: 0 },
);

const findingRows = findings
  .slice(0, 25)
  .map(
    (finding) =>
      `| ${sanitizeMarkdownCell(finding.id ?? "unknown", 100)} | ${sanitizeMarkdownCell(
        finding.category ?? "unknown",
        80,
      )} | ${sanitizeMarkdownCell(finding.state ?? "unknown", 20)} | ${sanitizeMarkdownCell(
        finding.title ?? finding.summary ?? "",
      )} |`,
  )
  .join("\n");
const workflowUrl = workflowRunUrlFromEnvironment();
const digest = sanitizeMarkdownCell(evidence.artifact?.sha256 ?? "not reported", 100);
const policyDigest = sanitizeMarkdownCell(evidence.policy?.sha256 ?? "not reported", 100);
const unresolvedSummary =
  unresolved.length > 0
    ? unresolved
        .slice(0, 100)
        .map((id) => `\`${sanitizeMarkdownCell(id, 100)}\``)
        .join(", ")
    : "none";
const summary = truncateUtf8(
  [
    `**Result:** ${passed ? "PASS" : "BLOCKED"}`,
    "",
    `- **Head SHA:** \`${headSha}\``,
    `- **Policy digest:** \`${policyDigest}\``,
    `- **Evidence digest:** \`${digest}\``,
    `- **Counts:** ${counts.pass} pass, ${counts.fail} fail, ${counts.unknown} unknown, ${counts.exception} exception`,
    `- **Unresolved:** ${unresolvedSummary}`,
    "",
    findings.length > 0
      ? ["| Finding | Category | State | Summary |", "|---|---|---|---|", findingRows].join("\n")
      : "No findings were reported.",
    "",
    "_The Evidence Board is a mutable coordination view. This GitHub check, its SHA-bound artifact, native comments, and reviews are the authoritative record._",
    "",
    `[Workflow run](${workflowUrl})`,
  ].join("\n"),
  65_000,
);

const commentBody = `${COMMENT_MARKER}\n## AgentProof gate\n\n${summary}`;
const comments = await githubPaginate(`${prefix}/issues/${pullRequestNumber}/comments`);
const existingComment = comments
  .filter(isAgentProofSummaryComment)
  .sort((left, right) => Number(right.id) - Number(left.id))[0];

await requireCurrentPullRequest();
let summaryComment;
if (existingComment) {
  const commentId = assertPositiveInteger(existingComment.id, "summary comment id");
  summaryComment = await githubRequest(`${prefix}/issues/comments/${commentId}`, {
    method: "PATCH",
    body: { body: commentBody },
  });
} else {
  summaryComment = await githubRequest(`${prefix}/issues/${pullRequestNumber}/comments`, {
    method: "POST",
    body: { body: commentBody },
  });
}
if (!isAgentProofSummaryComment(summaryComment)) {
  throw new Error("GitHub did not create or update the expected AgentProof summary");
}

await requireCurrentPullRequest();
const checkRuns = await githubRequest(
  `${prefix}/commits/${headSha}/check-runs?check_name=${encodeURIComponent(CHECK_NAME)}&filter=latest&per_page=100`,
);
const existingCheck = Array.isArray(checkRuns?.check_runs)
  ? checkRuns.check_runs
      .filter(isGitHubActionsCheckRun)
      .sort((left, right) => Number(right.id) - Number(left.id))[0]
  : undefined;
const checkBodies = buildCompletedCheckPayload({
  headSha,
  conclusion,
  detailsUrl: workflowUrl,
  now: new Date(),
  title: passed ? "AgentProof evidence is complete" : "AgentProof evidence is blocking",
  summary,
});
const checkRun = existingCheck
  ? await githubRequest(
      `${prefix}/check-runs/${assertPositiveInteger(existingCheck.id, "check run id")}`,
      { method: "PATCH", body: checkBodies.update },
    )
  : await githubRequest(`${prefix}/check-runs`, {
      method: "POST",
      body: checkBodies.create,
    });
if (
  !isGitHubActionsCheckRun(checkRun) ||
  assertSha(checkRun?.head_sha, "published check response head SHA") !== headSha ||
  checkRun?.status !== "completed" ||
  checkRun?.conclusion !== conclusion
) {
  throw new Error("GitHub did not publish the expected completed AgentProof check");
}

await setOutput("check_run_id", assertPositiveInteger(checkRun?.id, "published check run id"));
await setOutput("conclusion", conclusion);
