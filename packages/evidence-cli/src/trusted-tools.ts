import { createRequire } from "node:module";
import { readFile, realpath, stat } from "node:fs/promises";
import {
  basename,
  delimiter,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

import { AgentProofError } from "@agentproof/evidence-core";

export interface TrustedVitestTool {
  readonly command: string;
  readonly argsPrefix: readonly string[];
  readonly nodeModulesPath: string;
  readonly version: string | null;
}

export interface TrustedCommandTool {
  readonly command: string;
  readonly argsPrefix: readonly string[];
}

function isWithin(root: string, candidate: string): boolean {
  const difference = relative(root, candidate);
  return (
    difference === "" ||
    (!difference.startsWith(`..${sep}`) && difference !== ".." && !isAbsolute(difference))
  );
}

async function findVitestPackageJson(): Promise<string> {
  const require = createRequire(import.meta.url);
  try {
    return require.resolve("vitest/package.json");
  } catch {
    let entry: string;
    try {
      entry = require.resolve("vitest");
    } catch {
      throw new AgentProofError(
        "AP_TRUSTED_VITEST_UNAVAILABLE",
        "Trusted Vitest installation could not be resolved from the analyzer.",
      );
    }
    let current = dirname(entry);
    for (let depth = 0; depth < 8; depth += 1) {
      const candidate = resolve(current, "package.json");
      try {
        const value = JSON.parse(await readFile(candidate, "utf8")) as unknown;
        if (
          value !== null &&
          typeof value === "object" &&
          (value as Record<string, unknown>).name === "vitest"
        ) {
          return candidate;
        }
      } catch {
        // Continue toward the package root.
      }
      const parent = dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }
  throw new AgentProofError(
    "AP_TRUSTED_VITEST_UNAVAILABLE",
    "Trusted Vitest installation could not be resolved from the analyzer.",
  );
}

function findNodeModulesPath(packageRoot: string): string {
  let current = dirname(packageRoot);
  for (let depth = 0; depth < 8; depth += 1) {
    if (basename(current).toLowerCase() === "node_modules") {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  throw new AgentProofError(
    "AP_TRUSTED_NODE_MODULES_UNAVAILABLE",
    "Trusted analyzer dependencies are not under a node_modules directory.",
  );
}

export async function resolveTrustedVitest(): Promise<TrustedVitestTool> {
  const packageJsonPath = await findVitestPackageJson();
  const packageRoot = dirname(packageJsonPath);
  let packageValue: unknown;
  try {
    packageValue = JSON.parse(await readFile(packageJsonPath, "utf8")) as unknown;
  } catch {
    throw new AgentProofError(
      "AP_TRUSTED_VITEST_INVALID",
      "Trusted Vitest package metadata could not be read.",
    );
  }
  if (packageValue === null || typeof packageValue !== "object") {
    throw new AgentProofError(
      "AP_TRUSTED_VITEST_INVALID",
      "Trusted Vitest package metadata is malformed.",
    );
  }
  const packageRecord = packageValue as Record<string, unknown>;
  const binValue = packageRecord.bin;
  const bin =
    typeof binValue === "string"
      ? binValue
      : binValue !== null && typeof binValue === "object"
        ? (binValue as Record<string, unknown>).vitest
        : undefined;
  if (typeof bin !== "string" || isAbsolute(bin)) {
    throw new AgentProofError(
      "AP_TRUSTED_VITEST_INVALID",
      "Trusted Vitest package does not expose a valid executable.",
    );
  }

  let executable: string;
  try {
    executable = await realpath(resolve(packageRoot, bin));
    const information = await stat(executable);
    if (!information.isFile() || !isWithin(packageRoot, executable)) {
      throw new Error("invalid executable");
    }
  } catch {
    throw new AgentProofError(
      "AP_TRUSTED_VITEST_INVALID",
      "Trusted Vitest executable could not be validated.",
    );
  }
  return {
    command: process.execPath,
    argsPrefix: [executable],
    nodeModulesPath: findNodeModulesPath(packageRoot),
    version: typeof packageRecord.version === "string" ? packageRecord.version.slice(0, 80) : null,
  };
}

async function existingFile(path: string): Promise<string | null> {
  try {
    const resolved = await realpath(path);
    return (await stat(resolved)).isFile() ? resolved : null;
  } catch {
    return null;
  }
}

export async function resolveTrustedNpm(): Promise<TrustedCommandTool> {
  const executableDirectory = dirname(process.execPath);
  const cliCandidates =
    process.platform === "win32"
      ? [join(executableDirectory, "node_modules", "npm", "bin", "npm-cli.js")]
      : [resolve(executableDirectory, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js")];
  for (const candidate of cliCandidates) {
    const npmCli = await existingFile(candidate);
    if (npmCli !== null) {
      return { command: process.execPath, argsPrefix: [npmCli] };
    }
  }

  const pathValue = process.env.PATH ?? process.env.Path ?? "";
  const executableNames = process.platform === "win32" ? ["npm.cmd", "npm.exe"] : ["npm"];
  for (const directory of pathValue.split(delimiter)) {
    if (directory.length === 0 || !isAbsolute(directory)) {
      continue;
    }
    for (const name of executableNames) {
      const executable = await existingFile(join(directory, name));
      if (executable !== null) {
        return [".js", ".cjs", ".mjs"].includes(extname(executable).toLowerCase())
          ? { command: process.execPath, argsPrefix: [executable] }
          : { command: executable, argsPrefix: [] };
      }
    }
  }
  throw new AgentProofError(
    "AP_TRUSTED_NPM_UNAVAILABLE",
    "Trusted npm installation could not be resolved from the analyzer.",
  );
}
