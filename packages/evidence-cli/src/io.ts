import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { AgentProofError } from "@agentproof/evidence-core";

import type { TextCollectorSource } from "./collectors/types.js";

function withinRoot(root: string, candidate: string): boolean {
  const difference = relative(root, candidate);
  return (
    difference === "" ||
    (!difference.startsWith(`..${sep}`) && difference !== ".." && !isAbsolute(difference))
  );
}

export async function readBoundedTextFile(
  path: string,
  maximumBytes: number,
  code = "AP_INPUT_READ_ERROR",
): Promise<string> {
  let information: Awaited<ReturnType<typeof stat>>;
  try {
    information = await stat(path);
  } catch {
    throw new AgentProofError(code, `Input file could not be read: ${path}`);
  }
  if (!information.isFile()) {
    throw new AgentProofError(code, `Input path is not a file: ${path}`);
  }
  if (information.size > maximumBytes) {
    throw new AgentProofError(
      "AP_INPUT_TOO_LARGE",
      `Input file exceeds the ${maximumBytes}-byte limit: ${path}`,
    );
  }
  try {
    return await readFile(path, "utf8");
  } catch {
    throw new AgentProofError(code, `Input file could not be read: ${path}`);
  }
}

export async function readJsonFile(
  path: string,
  maximumBytes = 10 * 1024 * 1024,
): Promise<unknown> {
  const source = await readBoundedTextFile(path, maximumBytes);
  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new AgentProofError("AP_JSON_INVALID", `Input is not valid JSON: ${path}`);
  }
}

function portablePath(value: string): string {
  return value.split(sep).join("/");
}

export interface WorkspaceDirectory {
  readonly root: string;
  readonly absolutePath: string;
  readonly logicalPath: string;
}

export async function resolveWorkspaceDirectory(
  workspacePath: string,
  sourcePath: string,
): Promise<WorkspaceDirectory> {
  if (
    isAbsolute(sourcePath) ||
    sourcePath.split(/[\\/]/u).includes("..") ||
    sourcePath.includes("\0")
  ) {
    throw new AgentProofError(
      "AP_WORKSPACE_PATH_INVALID",
      "Workspace directory must be a contained relative path.",
    );
  }
  let root: string;
  let absolutePath: string;
  try {
    root = await realpath(workspacePath);
    absolutePath = await realpath(resolve(root, sourcePath));
  } catch {
    throw new AgentProofError("AP_WORKSPACE_PATH_INVALID", "Workspace directory does not exist.");
  }
  if (!withinRoot(root, absolutePath)) {
    throw new AgentProofError(
      "AP_WORKSPACE_PATH_INVALID",
      "Workspace directory resolves outside the analysis workspace.",
    );
  }
  const information = await stat(absolutePath);
  if (!information.isDirectory()) {
    throw new AgentProofError("AP_WORKSPACE_PATH_INVALID", "Workspace path is not a directory.");
  }
  return {
    root,
    absolutePath,
    logicalPath: portablePath(relative(root, absolutePath)),
  };
}

export async function readWorkspaceSource(
  workspacePath: string,
  sourcePath: string | null,
  maximumBytes: number,
): Promise<TextCollectorSource> {
  if (sourcePath === null) {
    return { content: null, path: null, error: "Source path was not provided." };
  }
  if (
    isAbsolute(sourcePath) ||
    sourcePath.split(/[\\/]/u).includes("..") ||
    sourcePath.includes("\0")
  ) {
    return {
      content: null,
      path: null,
      error: "Source path must remain inside the analysis workspace.",
    };
  }

  let root: string;
  try {
    root = await realpath(workspacePath);
  } catch {
    throw new AgentProofError("AP_WORKSPACE_INVALID", "Analysis workspace does not exist.");
  }
  const candidate = resolve(root, sourcePath);
  if (!withinRoot(root, candidate)) {
    return {
      content: null,
      path: null,
      error: "Source path escapes the analysis workspace.",
    };
  }
  const logicalPath = portablePath(relative(root, candidate));

  let resolvedCandidate: string;
  try {
    resolvedCandidate = await realpath(candidate);
  } catch {
    return {
      content: null,
      path: logicalPath,
      error: "Collector source file is absent.",
    };
  }
  if (!withinRoot(root, resolvedCandidate)) {
    return {
      content: null,
      path: logicalPath,
      error: "Collector source resolves outside the analysis workspace.",
    };
  }

  let information: Awaited<ReturnType<typeof stat>>;
  try {
    information = await stat(resolvedCandidate);
  } catch {
    return {
      content: null,
      path: logicalPath,
      error: "Collector source file cannot be inspected.",
    };
  }
  if (!information.isFile()) {
    return {
      content: null,
      path: logicalPath,
      error: "Collector source path is not a file.",
    };
  }
  if (information.size > maximumBytes) {
    return {
      content: null,
      path: logicalPath,
      error: `Collector source exceeds ${maximumBytes} bytes.`,
    };
  }
  try {
    return {
      content: await readFile(resolvedCandidate, "utf8"),
      path: logicalPath,
      error: null,
    };
  } catch {
    return {
      content: null,
      path: logicalPath,
      error: "Collector source file could not be read.",
    };
  }
}

export async function readCollectorOutput(
  outputPath: string,
  maximumBytes: number,
): Promise<TextCollectorSource> {
  try {
    return {
      content: await readBoundedTextFile(outputPath, maximumBytes, "AP_COLLECTOR_OUTPUT_ERROR"),
      path: null,
      error: null,
    };
  } catch {
    return {
      content: null,
      path: null,
      error: "Collector output is absent, unreadable, or exceeds its bound.",
    };
  }
}

export async function writeJsonAtomic(outputPath: string, value: unknown): Promise<void> {
  const parent = dirname(resolve(outputPath));
  await mkdir(parent, { recursive: true });
  const temporaryPath = `${resolve(outputPath)}.agentproof-${process.pid}-${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporaryPath, resolve(outputPath));
  } catch (error) {
    await rm(temporaryPath, { force: true });
    if (error instanceof AgentProofError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "write failed";
    throw new AgentProofError("AP_OUTPUT_WRITE_ERROR", `Could not write output JSON: ${message}`);
  }
}
