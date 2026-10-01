import { assertPositiveInteger, assertSha, repositoryFromEnvironment } from "./github-api.mjs";
import { loadDefaultBranchPullRequest } from "./gate-check.mjs";
import { dispatchRevalidation } from "./dispatch-revalidation.mjs";
import { workflowRunUrlFromEnvironment } from "./workflow-helpers.mjs";

const repository = repositoryFromEnvironment();
const pullRequestNumber = assertPositiveInteger(process.env.INPUT_PR_NUMBER, "INPUT_PR_NUMBER");
const expectedHeadSha = assertSha(process.env.EXPECTED_HEAD_SHA, "EXPECTED_HEAD_SHA");
const { repositoryData, pullRequest } = await loadDefaultBranchPullRequest(
  repository,
  pullRequestNumber,
);
if (assertSha(pullRequest.head?.sha, "live PR head SHA") !== expectedHeadSha) {
  throw new Error("Pull request head changed before scheduled revalidation");
}

await dispatchRevalidation({
  repository,
  repositoryData,
  pullRequest,
  detailsUrl: workflowRunUrlFromEnvironment(),
  reason: "scheduled revalidation",
});
