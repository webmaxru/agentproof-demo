import {
  assertPositiveInteger,
  assertSha,
  githubRequest,
  repositoryFromEnvironment,
} from "./github-api.mjs";
import { createPendingGateCheck, loadDefaultBranchPullRequest } from "./gate-check.mjs";
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

const identity = await createPendingGateCheck({
  repository,
  repositoryData,
  pullRequest,
  detailsUrl: workflowRunUrlFromEnvironment(),
  reason: "scheduled revalidation",
});
await githubRequest(
  `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(
    repository.repo,
  )}/actions/workflows/agentproof-analyze.yml/dispatches`,
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
console.log(`Dispatched AgentProof revalidation for PR #${identity.number}.`);
