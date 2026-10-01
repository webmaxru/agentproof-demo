import {
  collaboratorPermission,
  permissionRank,
  readEvent,
  repositoryFromEnvironment,
} from "./github-api.mjs";
import { loadDefaultBranchPullRequest } from "./gate-check.mjs";
import { dispatchRevalidation } from "./dispatch-revalidation.mjs";
import { classifyDispositionEvent, workflowRunUrlFromEnvironment } from "./workflow-helpers.mjs";

const event = await readEvent();
if (!event.issue?.pull_request) {
  console.log("Ignoring a comment that is not attached to a pull request.");
  process.exit(0);
}

const classification = classifyDispositionEvent(event);
if (!classification.shouldDispatch) {
  console.log(`Ignoring ${classification.reason}.`);
  process.exit(0);
}

const repository = repositoryFromEnvironment();
if (classification.requiresAuthorization) {
  const username = event.comment?.user?.login;
  if (!username || event.comment?.user?.type !== "User" || event.sender?.login !== username) {
    throw new Error("A new disposition command must be authored directly by a user");
  }
  const permission = await collaboratorPermission({ ...repository, username });
  if (permissionRank(permission) < permissionRank("maintain")) {
    console.log(
      `Ignoring a new AgentProof command from @${username} with ${permission} permission.`,
    );
    process.exit(0);
  }
}

const { repositoryData, pullRequest } = await loadDefaultBranchPullRequest(
  repository,
  event.issue.number,
);
await dispatchRevalidation({
  repository,
  repositoryData,
  pullRequest,
  detailsUrl: workflowRunUrlFromEnvironment(),
  reason: classification.reason,
});
