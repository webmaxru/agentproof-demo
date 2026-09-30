import {
  githubPaginate,
  githubRequest,
  repositoryFromEnvironment,
  setOutput,
} from "./github-api.mjs";
import { isTrustedPullRequestAuthor, validateLivePullRequest } from "./workflow-helpers.mjs";

const repository = repositoryFromEnvironment();
const prefix = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(
  repository.repo,
)}`;
const repositoryData = await githubRequest(prefix);
const pullRequests = await githubPaginate(
  `${prefix}/pulls?state=open&base=${encodeURIComponent(repositoryData.default_branch)}`,
);
const trustedPullRequests = pullRequests.filter(isTrustedPullRequestAuthor);
if (trustedPullRequests.length > 256) {
  throw new Error("Scheduled revalidation supports at most 256 open pull requests");
}

const matrix = trustedPullRequests.map((pullRequest) => {
  const identity = validateLivePullRequest({ repository: repositoryData, pullRequest });
  return {
    pr_number: String(identity.number),
    head_sha: identity.headSha,
  };
});
await setOutput("pull_requests", JSON.stringify(matrix));
console.log(`Found ${matrix.length} trusted-author pull request(s) for revalidation.`);
