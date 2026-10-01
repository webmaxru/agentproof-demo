import {
  assertPositiveInteger,
  githubRequest,
  readEvent,
  repositoryFromEnvironment,
  setOutput,
} from "./github-api.mjs";
import {
  validateAnalysisRun,
  validateDispatchedAnalysis,
  validatePublisherRun,
} from "./workflow-helpers.mjs";

const repository = repositoryFromEnvironment();
const event = await readEvent();
const eventName = process.env.GITHUB_EVENT_NAME;
const publisherRunId = assertPositiveInteger(process.env.GITHUB_RUN_ID, "publisher run id");
const prefix = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
const [repositoryData, publisherRun, publisherWorkflow] = await Promise.all([
  githubRequest(prefix),
  githubRequest(`${prefix}/actions/runs/${publisherRunId}`),
  githubRequest(`${prefix}/actions/workflows/agentproof-publish.yml`),
]);
validatePublisherRun({
  eventName,
  event,
  run: publisherRun,
  workflow: publisherWorkflow,
  repository: repositoryData,
  context: {
    runId: publisherRunId,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    ref: process.env.GITHUB_REF,
    sha: process.env.GITHUB_SHA,
    workflowRef: process.env.GITHUB_WORKFLOW_REF,
  },
});
const eventRunId = assertPositiveInteger(
  eventName === "workflow_dispatch" ? event.inputs?.analysis_run_id : event.workflow_run?.id,
  "analysis workflow run id",
);
const [run, workflow, artifactPage] = await Promise.all([
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

const validate =
  eventName === "workflow_dispatch" ? validateDispatchedAnalysis : validateAnalysisRun;
const validated = validate({
  event,
  run,
  workflow,
  repository: repositoryData,
  artifacts: artifactPage.artifacts,
});

await setOutput("run_id", validated.runId);
await setOutput("run_attempt", validated.runAttempt);
await setOutput("artifact_id", validated.artifactId);
await setOutput("artifact_name", validated.artifactName);
await setOutput("artifact_digest", validated.artifactDigest);
await setOutput("pr_number", validated.pullRequestNumber);
await setOutput("head_sha", validated.headSha);
