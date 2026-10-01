import { lstat, readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import {
  assertPositiveInteger,
  assertSha,
  githubRequest,
  repositoryFromEnvironment,
  setOutput,
} from "./github-api.mjs";
import {
  resolveTrustedWorkflowRevision,
  validateCompletedAnalysisRun,
  validateEvidenceHandoff,
} from "./workflow-helpers.mjs";

const metadataPath = process.env.METADATA_PATH;
const rawEvidencePath = process.env.RAW_EVIDENCE_PATH;
const incomingPath = process.env.INCOMING_PATH;
if (!metadataPath || !rawEvidencePath || !incomingPath) {
  throw new Error("INCOMING_PATH, METADATA_PATH, and RAW_EVIDENCE_PATH are required");
}
const expectedFiles = ["metadata.json", "raw-evidence.json"];
const actualFiles = (await readdir(incomingPath)).sort();
if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error("Downloaded artifact must contain exactly metadata.json and raw-evidence.json");
}
for (const path of [metadataPath, rawEvidencePath]) {
  if (resolve(path) !== resolve(incomingPath, basename(path))) {
    throw new Error("Evidence file path escapes the incoming artifact directory");
  }
  const details = await lstat(path);
  if (!details.isFile() || details.size <= 0 || details.size > 10 * 1024 * 1024) {
    throw new Error(`Evidence file ${basename(path)} is not a bounded regular file`);
  }
}

const [metadata, rawEvidence] = await Promise.all([
  readFile(metadataPath, "utf8").then(JSON.parse),
  readFile(rawEvidencePath, "utf8").then(JSON.parse),
]);
const repository = repositoryFromEnvironment();
const expectedPullRequestNumber = assertPositiveInteger(
  process.env.EXPECTED_PR_NUMBER,
  "EXPECTED_PR_NUMBER",
);
const expectedRunId = assertPositiveInteger(process.env.EXPECTED_RUN_ID, "EXPECTED_RUN_ID");
const [repositoryData, pullRequest, analysisRun, analysisWorkflow] = await Promise.all([
  githubRequest(
    `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`,
  ),
  githubRequest(
    `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/pulls/${expectedPullRequestNumber}`,
  ),
  githubRequest(
    `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/actions/runs/${expectedRunId}`,
  ),
  githubRequest(
    `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/actions/workflows/agentproof-analyze.yml`,
  ),
]);
const workflowSha = await resolveTrustedWorkflowRevision({
  repository: repositoryData,
  expectedSha: assertSha(process.env.EXPECTED_WORKFLOW_SHA, "EXPECTED_WORKFLOW_SHA"),
});
validateCompletedAnalysisRun({
  run: analysisRun,
  workflow: analysisWorkflow,
  repository: repositoryData,
  expectedRunId,
  expectedWorkflowSha: workflowSha,
  publisherEvent: process.env.GITHUB_EVENT_NAME,
  expectedRunAttempt: assertPositiveInteger(
    process.env.EXPECTED_RUN_ATTEMPT,
    "EXPECTED_RUN_ATTEMPT",
  ),
});

const identity = validateEvidenceHandoff({
  metadata,
  rawEvidence,
  expected: {
    pullRequestNumber: expectedPullRequestNumber,
    headSha: process.env.EXPECTED_HEAD_SHA,
    artifactName: process.env.EXPECTED_ARTIFACT_NAME,
    runId: expectedRunId,
    serverUrl: process.env.GITHUB_SERVER_URL,
  },
  repository: repositoryData,
  pullRequest,
});

await setOutput("pr_number", identity.number);
await setOutput("head_sha", identity.headSha);
await setOutput("base_sha", identity.baseSha);
await setOutput(
  "final_artifact_name",
  `agentproof-evidence-pr-${identity.number}-${identity.headSha}`,
);
