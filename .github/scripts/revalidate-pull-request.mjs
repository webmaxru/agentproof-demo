import { assertSha, readEvent, repositoryFromEnvironment } from "./github-api.mjs";
import { loadDefaultBranchPullRequest } from "./gate-check.mjs";
import { dispatchRevalidation } from "./dispatch-revalidation.mjs";
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

await dispatchRevalidation({
  repository,
  repositoryData,
  pullRequest,
  detailsUrl: workflowRunUrlFromEnvironment(),
  reason: `pull request ${String(event.action)}`,
});
