import { setTimeout as delay } from "node:timers/promises";
import { assertPositiveInteger, assertSha, githubRequest } from "./github-api.mjs";
import { createPendingGateCheck } from "./gate-check.mjs";
import {
  isControllerAnalysis,
  validateAnalysisRunIdentity,
  validateNativeAnalysisRun,
  validateUnchangedPullRequest,
} from "./workflow-helpers.mjs";

export const ANALYSIS_WAIT_MS = 20 * 60 * 1000;
const POLL_INTERVAL_MS = 10_000;

export async function dispatchRevalidation(
  { repository, repositoryData, pullRequest, detailsUrl, reason },
  { request = githubRequest, sleep = delay, now = Date.now } = {},
) {
  const identity = await createPendingGateCheck(
    { repository, repositoryData, pullRequest, detailsUrl, reason },
    request,
  );
  const prefix = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
  const workflow = await request(`${prefix}/actions/workflows/agentproof-analyze.yml`);

  async function dispatch(file, inputs) {
    // API 2026-03-10 always returns native run details; never guess from a run list.
    const response = await request(`${prefix}/actions/workflows/${file}/dispatches`, {
      method: "POST",
      body: { ref: repositoryData.default_branch, inputs },
    });
    const runId = assertPositiveInteger(response?.workflow_run_id, "dispatch response run id");
    if (
      response.run_url !== `https://api.github.com${prefix}/actions/runs/${runId}` ||
      response.html_url !== `https://github.com/${repositoryData.full_name}/actions/runs/${runId}`
    ) {
      throw new Error("Dispatch response does not identify the exact repository run");
    }
    return runId;
  }

  const analysisRunId = await dispatch("agentproof-analyze.yml", {
    pr_number: String(identity.number),
    expected_head_sha: identity.headSha,
  });
  const deadline = now() + ANALYSIS_WAIT_MS;
  let run;
  while (true) {
    const remaining = deadline - now();
    if (remaining <= 0) {
      throw new Error(`Analysis run ${analysisRunId} exceeded the bounded revalidation wait`);
    }
    run = await request(`${prefix}/actions/runs/${analysisRunId}`, {
      signal: AbortSignal.timeout(Math.min(30_000, remaining)),
    });
    validateAnalysisRunIdentity({
      run,
      workflow,
      repository: repositoryData,
      expectedRunId: analysisRunId,
      expectedRunAttempt: 1,
    });
    if (!isControllerAnalysis(run) || assertSha(run.head_sha) !== identity.baseSha) {
      throw new Error("Analysis dispatch did not use the expected trusted base and controller");
    }
    if (now() >= deadline) {
      throw new Error(`Analysis run ${analysisRunId} exceeded the bounded revalidation wait`);
    }
    if (run.status === "completed") {
      if (run.conclusion !== "success") {
        throw new Error(`Analysis run ${analysisRunId} completed without success`);
      }
      break;
    }
    if (!["queued", "requested", "waiting", "pending", "in_progress"].includes(run.status)) {
      throw new Error(`Analysis run ${analysisRunId} has an unsupported status`);
    }
    await sleep(Math.min(POLL_INTERVAL_MS, deadline - now()));
  }

  const artifactPage = await request(
    `${prefix}/actions/runs/${analysisRunId}/artifacts?per_page=100`,
  );
  if (
    !Number.isSafeInteger(artifactPage?.total_count) ||
    artifactPage.total_count !== artifactPage?.artifacts?.length
  ) {
    throw new Error("Analysis artifact listing is incomplete or malformed");
  }
  const validated = validateNativeAnalysisRun({
    run,
    workflow,
    repository: repositoryData,
    artifacts: artifactPage.artifacts,
    expectedRunId: analysisRunId,
    expectedRunAttempt: 1,
  });
  if (validated.pullRequestNumber !== identity.number || validated.headSha !== identity.headSha) {
    throw new Error("Analysis artifact does not match the dispatched pull request head");
  }
  const [currentRepository, currentPullRequest] = await Promise.all([
    request(prefix),
    request(`${prefix}/pulls/${identity.number}`),
  ]);
  if (
    currentRepository.id !== repositoryData.id ||
    currentRepository.full_name !== repositoryData.full_name ||
    currentRepository.default_branch !== repositoryData.default_branch
  ) {
    throw new Error("Repository identity changed during revalidation");
  }
  validateUnchangedPullRequest({
    repository: currentRepository,
    pullRequest: currentPullRequest,
    previous: pullRequest,
  });
  const publisherRunId = await dispatch("agentproof-publish.yml", {
    analysis_run_id: String(analysisRunId),
    analysis_run_attempt: String(validated.runAttempt),
  });
  // The publisher needs our per-PR gate lock. Release it; never wait for publication here.
  console.log(`Dispatched publisher run ${publisherRunId} for analysis run ${analysisRunId}.`);
  return { analysisRunId, publisherRunId };
}
