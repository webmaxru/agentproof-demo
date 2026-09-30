import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  collaboratorPermission,
  githubPaginate,
  repositoryFromEnvironment,
} from "./github-api.mjs";
import { isAgentProofCommandCandidate } from "./workflow-helpers.mjs";

const metadataPath = process.env.METADATA_PATH;
const outputPath = process.env.DISPOSITIONS_PATH;
if (!metadataPath || !outputPath) {
  throw new Error("METADATA_PATH and DISPOSITIONS_PATH are required");
}

const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
const repository = repositoryFromEnvironment();
const comments = await githubPaginate(
  `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/issues/${metadata.pullRequestNumber}/comments`,
);
const candidates = comments.filter((comment) => isAgentProofCommandCandidate(comment.body));

const permissions = new Map();
for (const comment of candidates) {
  const username = comment.user?.login ?? "unknown";
  if (!permissions.has(username)) {
    permissions.set(
      username,
      comment.user?.type === "User"
        ? await collaboratorPermission({ ...repository, username })
        : "none",
    );
  }
}

const dispositions = candidates.map((comment) => {
  const author = comment.user?.login ?? "unknown";
  return {
    commentId: comment.id,
    nodeId: comment.node_id,
    body: comment.body,
    author,
    authorAssociation: comment.author_association ?? "NONE",
    permission: permissions.get(author) ?? "none",
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    url: comment.html_url,
  };
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(dispositions, null, 2)}\n`, "utf8");
