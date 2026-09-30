import {
  evaluateEvidence,
  loadReleasePolicyYaml,
  parseDispositionInput,
  boundedHttpUrlSchema,
  type FinalEvidence,
} from "@agentproof/evidence-core";

import { readBoundedTextFile, readJsonFile, writeJsonAtomic } from "../io.js";

export interface EvaluateCommandOptions {
  readonly evidencePath: string;
  readonly policyPath: string;
  readonly dispositionsPath: string;
  readonly outputPath: string;
}

export async function evaluateCommand(options: EvaluateCommandOptions): Promise<FinalEvidence> {
  const [rawEvidence, policySource, dispositionJson] = await Promise.all([
    readJsonFile(options.evidencePath),
    readBoundedTextFile(options.policyPath, 256 * 1024, "AP_POLICY_READ_ERROR"),
    readJsonFile(options.dispositionsPath, 4 * 1024 * 1024),
  ]);
  const policy = loadReleasePolicyYaml(policySource);
  const dispositions = parseDispositionInput(dispositionJson);
  const workflowRunUrlCandidate =
    process.env.GITHUB_SERVER_URL !== undefined &&
    process.env.GITHUB_REPOSITORY !== undefined &&
    process.env.GITHUB_RUN_ID !== undefined
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null;
  const workflowRunUrlResult =
    workflowRunUrlCandidate === null
      ? null
      : boundedHttpUrlSchema.safeParse(workflowRunUrlCandidate);
  const workflowRunUrl =
    workflowRunUrlResult !== null && workflowRunUrlResult.success
      ? workflowRunUrlResult.data
      : undefined;
  const evidence = evaluateEvidence({
    rawEvidence,
    policy,
    dispositions,
    ...(workflowRunUrl === undefined ? {} : { workflowRunUrl }),
  });
  await writeJsonAtomic(options.outputPath, evidence);
  return evidence;
}
