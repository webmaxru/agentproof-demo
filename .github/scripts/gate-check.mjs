import { assertPositiveInteger, assertSha, githubRequest } from "./github-api.mjs";
import {
  buildPendingCheckPayload,
  isGitHubActionsCheckRun,
  validateLivePullRequest,
} from "./workflow-helpers.mjs";

export async function loadDefaultBranchPullRequest(repository, pullRequestNumber) {
  const number = assertPositiveInteger(pullRequestNumber, "pull request number");
  const [repositoryData, pullRequest] = await Promise.all([
    githubRequest(
      `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`,
    ),
    githubRequest(
      `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/pulls/${number}`,
    ),
  ]);
  validateLivePullRequest({
    repository: repositoryData,
    pullRequest,
    expectedPullRequestNumber: number,
  });
  return { repositoryData, pullRequest };
}

export async function createPendingGateCheck(
  { repository, repositoryData, pullRequest, detailsUrl, reason },
  request = githubRequest,
) {
  const identity = validateLivePullRequest({
    repository: repositoryData,
    pullRequest,
  });
  const payload = buildPendingCheckPayload({
    headSha: identity.headSha,
    detailsUrl,
    reason,
    now: new Date(),
  });
  const created = await request(
    `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/check-runs`,
    { method: "POST", body: payload },
  );
  assertPositiveInteger(created?.id, "pending check run id");
  if (
    !isGitHubActionsCheckRun(created) ||
    assertSha(created?.head_sha, "pending check response head SHA") !== identity.headSha ||
    created?.status !== "in_progress" ||
    created?.conclusion !== null
  ) {
    throw new Error("GitHub did not create the expected pending AgentProof check");
  }
  return identity;
}
