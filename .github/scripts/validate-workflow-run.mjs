import {
  assertPositiveInteger,
  githubRequest,
  readEvent,
  repositoryFromEnvironment,
  setOutput,
} from "./github-api.mjs";
import { validateAnalysisRun } from "./workflow-helpers.mjs";

const repository = repositoryFromEnvironment();
const event = await readEvent();
const eventRunId = assertPositiveInteger(event?.workflow_run?.id, "event workflow run id");
const prefix = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
const [repositoryData, run, workflow, artifactPage] = await Promise.all([
  githubRequest(prefix),
  githubRequest(`${prefix}/actions/runs/${eventRunId}`),
  githubRequest(`${prefix}/actions/workflows/agentproof-analyze.yml`),
  githubRequest(`${prefix}/actions/runs/${eventRunId}/artifacts?per_page=100`),
]);

if (
  !Number.isSafeInteger(artifactPage?.total_count) ||
  artifactPage.total_count !== artifactPage?.artifacts?.length
) {
  throw new Error("Analysis artifact listing is incomplete or malformed");
}

const validated = validateAnalysisRun({
  event,
  run,
  workflow,
  repository: repositoryData,
  artifacts: artifactPage.artifacts,
});

await setOutput("run_id", validated.runId);
await setOutput("artifact_id", validated.artifactId);
await setOutput("artifact_name", validated.artifactName);
await setOutput("artifact_digest", validated.artifactDigest);
await setOutput("pr_number", validated.pullRequestNumber);
await setOutput("head_sha", validated.headSha);
