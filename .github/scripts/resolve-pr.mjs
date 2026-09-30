import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  assertPositiveInteger,
  assertSha,
  githubRequest,
  readEvent,
  repositoryFromEnvironment,
  setOutput,
} from "./github-api.mjs";
import { APPLICATION_PATH } from "./workflow-helpers.mjs";

const repository = repositoryFromEnvironment();
const event = await readEvent();

const number = assertPositiveInteger(
  event.pull_request?.number ?? process.env.INPUT_PR_NUMBER ?? event.inputs?.pr_number,
  "pr_number",
);
const [repositoryData, pullRequest] = await Promise.all([
  githubRequest(
    `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`,
  ),
  githubRequest(
    `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/pulls/${number}`,
  ),
]);
if (pullRequest.state !== "open") {
  throw new Error(`Pull request #${number} is not open`);
}
if (
  pullRequest.base?.repo?.full_name?.toLowerCase() !== repository.fullName.toLowerCase() ||
  pullRequest.base?.ref !== repositoryData.default_branch
) {
  throw new Error("Pull request must target this repository's default branch");
}
if (event.pull_request?.number !== undefined && event.pull_request.number !== pullRequest.number) {
  throw new Error("Pull request event identity changed");
}

const headSha = assertSha(pullRequest.head?.sha, "head SHA");
const baseSha = assertSha(pullRequest.base?.sha, "base SHA");
if (headSha === baseSha) {
  throw new Error("Pull request base and head SHAs must differ");
}
const expectedHeadSha = process.env.EXPECTED_HEAD_SHA;
if (expectedHeadSha && assertSha(expectedHeadSha, "expected head SHA") !== headSha) {
  throw new Error("Pull request head changed before analysis started");
}
const metadataPath = process.env.METADATA_PATH;
if (!metadataPath) {
  throw new Error("METADATA_PATH is required");
}

const metadata = {
  schemaVersion: "1.0.0",
  repository: repository.fullName,
  pullRequestNumber: pullRequest.number,
  pullRequestUrl: pullRequest.html_url,
  pullRequestBody: String(pullRequest.body ?? "").slice(0, 50_000),
  author: pullRequest.user?.login ?? "unknown",
  authorAssociation: pullRequest.author_association ?? "NONE",
  baseRef: pullRequest.base?.ref,
  baseSha,
  headRef: pullRequest.head?.ref,
  headSha,
  appPath: APPLICATION_PATH,
};

await mkdir(dirname(metadataPath), { recursive: true });
await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

await setOutput("pr_number", pullRequest.number);
await setOutput("head_sha", headSha);
await setOutput("base_sha", baseSha);
await setOutput("artifact_name", `agentproof-raw-pr-${pullRequest.number}-${headSha}`);
