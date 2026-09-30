import { assertSha, githubRequest, readEvent, repositoryFromEnvironment } from "./github-api.mjs";
import { createPendingGateCheck, loadDefaultBranchPullRequest } from "./gate-check.mjs";
import { isTrustedPullRequestAuthor, workflowRunUrlFromEnvironment } from "./workflow-helpers.mjs";

const repository = repositoryFromEnvironment();
const event = await readEvent();
if (
  !["edited", "reopened", "ready_for_review"].includes(event.action) ||
  !event.pull_request?.number
) {
  throw new Error("A pull_request_target event is required");
}

const { repositoryData, pullRequest } = await loadDefaultBranchPullRequest(
  repository,
  event.pull_request.number,
);
if (!isTrustedPullRequestAuthor(pullRequest)) {
  console.log("Ignoring revalidation for a pull request from an untrusted author.");
  process.exit(0);
}
const eventHeadSha = assertSha(event.pull_request.head?.sha, "event PR head SHA");
const liveHeadSha = assertSha(pullRequest.head?.sha, "live PR head SHA");
if (eventHeadSha !== liveHeadSha) {
  throw new Error("Pull request head changed before revalidation was queued");
}

const identity = await createPendingGateCheck({
  repository,
  repositoryData,
  pullRequest,
  detailsUrl: workflowRunUrlFromEnvironment(),
  reason: `pull request ${String(event.action)}`,
});
await githubRequest(
  `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/actions/workflows/agentproof-analyze.yml/dispatches`,
  {
    method: "POST",
    body: {
      ref: repositoryData.default_branch,
      inputs: {
        pr_number: String(identity.number),
        expected_head_sha: identity.headSha,
      },
    },
  },
);
