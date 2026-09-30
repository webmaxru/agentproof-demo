import { AgentProofError, assembleEvidence, type FinalEvidence } from "@agentproof/evidence-core";

import { readJsonFile, writeJsonAtomic } from "../io.js";

export interface AssembleCommandOptions {
  readonly fragmentPaths: readonly string[];
  readonly outputPath: string;
}

export async function assembleCommand(options: AssembleCommandOptions): Promise<FinalEvidence> {
  if (options.fragmentPaths.length < 2) {
    throw new AgentProofError(
      "AP_ASSEMBLY_INPUT_INVALID",
      "Assemble requires one final evidence document and at least one review fragment.",
    );
  }
  const inputs = await Promise.all(options.fragmentPaths.map((path) => readJsonFile(path)));
  const evidenceInputs: unknown[] = [];
  const reviewInputs: unknown[] = [];
  for (const input of inputs) {
    const documentType =
      input !== null && typeof input === "object"
        ? (input as Record<string, unknown>).documentType
        : undefined;
    if (documentType === "final") {
      evidenceInputs.push(input);
    } else if (documentType === "review-fragment") {
      reviewInputs.push(input);
    } else {
      throw new AgentProofError(
        "AP_ASSEMBLY_INPUT_INVALID",
        "Every assembly input must be final evidence or a review fragment.",
      );
    }
  }
  if (evidenceInputs.length !== 1 || reviewInputs.length === 0) {
    throw new AgentProofError(
      "AP_ASSEMBLY_INPUT_INVALID",
      "Assemble requires exactly one final evidence document and one or more review fragments.",
    );
  }
  const evidence = assembleEvidence(evidenceInputs[0], reviewInputs);
  await writeJsonAtomic(options.outputPath, evidence);
  return evidence;
}
