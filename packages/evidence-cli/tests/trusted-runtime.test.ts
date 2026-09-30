import { mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { FINDING_IDS, parseRawEvidence } from "@agentproof/evidence-core";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prepareCollectorWorkspace, removeCollectorWorkspace } from "../src/collector-workspace.js";
import * as commandRunner from "../src/command-runner.js";
import type { RunCommandOptions } from "../src/command-runner.js";
import { analyzeCommand } from "../src/commands/analyze.js";
import { resolveWorkspaceDirectory } from "../src/io.js";
import { resolveTrustedNpm, resolveTrustedVitest } from "../src/trusted-tools.js";

const workRoot = fileURLToPath(new URL("../.collector-test-work/", import.meta.url));
const layouts = [
  { name: "root", appPath: "." },
  { name: "nested", appPath: "services/api" },
];
const runCommand = commandRunner.runBoundedCommand;

async function mockAudit(): Promise<RunCommandOptions[]> {
  const report = await readFile(new URL("fixtures/npm-audit/clean.json", import.meta.url), "utf8");
  const calls: RunCommandOptions[] = [];
  vi.spyOn(commandRunner, "runBoundedCommand").mockImplementation(async (options) => {
    calls.push(options);
    if (options.args.includes("audit")) {
      return { exitCode: 0, stdout: report, error: null };
    }
    if (options.args.includes("--version")) {
      return { exitCode: 0, stdout: "11.2.0\n", error: null };
    }
    return runCommand({ ...options, timeoutMs: 120_000 });
  });
  return calls;
}

async function analyzeFixture(repositoryPath: string, appPath: string) {
  const outputDirectory = join(repositoryPath, ".agentproof");
  await mkdir(outputDirectory, { recursive: true });
  const metadataPath = join(outputDirectory, "metadata.json");
  const outputPath = join(outputDirectory, "raw.json");
  await writeFile(
    metadataPath,
    JSON.stringify({
      schemaVersion: "1.0.0",
      repository: "OWNER/REPO",
      pullRequestNumber: 1,
      baseSha: "1".repeat(40),
      headSha: "2".repeat(40),
      pullRequestBody:
        "## AI assistance origin\n\n- Classification: self-declared\n- Declared tool: GitHub Copilot",
      appPath,
    }),
  );
  const raw = await analyzeCommand({ workspacePath: repositoryPath, metadataPath, outputPath });
  expect(parseRawEvidence(JSON.parse(await readFile(outputPath, "utf8")) as unknown)).toEqual(raw);
  return raw;
}

describe.sequential("trusted collector runtime", () => {
  beforeAll(async () => {
    await rm(workRoot, { recursive: true, force: true });
    for (const layout of layouts) {
      const repositoryPath = join(workRoot, layout.name);
      const appPath = join(repositoryPath, layout.appPath);
      for (const directory of ["src", "tests", "config", "Node_Modules"]) {
        await mkdir(join(appPath, directory), { recursive: true });
      }
      await writeFile(
        join(repositoryPath, "package.json"),
        JSON.stringify({
          name: "isolated-test-fixture",
          version: "1.0.0",
          type: "module",
          scripts: { test: "node -e \"throw new Error('untrusted script ran')\"" },
        }),
      );
      await writeFile(
        join(repositoryPath, "package-lock.json"),
        '{"name":"isolated-test-fixture","version":"1.0.0","lockfileVersion":3,"packages":{}}\n',
      );
      await writeFile(
        join(repositoryPath, "tsconfig.base.json"),
        '{"compilerOptions":{"strict":true}}\n',
      );
      await writeFile(
        join(appPath, "tsconfig.json"),
        JSON.stringify({
          extends: layout.appPath === "." ? "./tsconfig.base.json" : "../../tsconfig.base.json",
        }),
      );
      await writeFile(
        join(appPath, "src", "server.ts"),
        'export function canApprove(role: string): boolean { return role === "approver"; }\n',
      );
      await writeFile(
        join(appPath, "tests", "authorization.test.ts"),
        [
          'import { expect, it } from "vitest";',
          'import { canApprove } from "../src/server.js";',
          'it("denies a non-approver [AP-ID:authorization.non-approver-denied]", () => {',
          '  expect(canApprove("reader")).toBe(false);',
          "});",
          'it("allows an approver", () => { expect(canApprove("approver")).toBe(true); });',
        ].join("\n"),
      );
      await writeFile(
        join(appPath, "vitest.config.ts"),
        'throw new Error("untrusted Vitest config ran");\n',
      );
      await writeFile(join(appPath, "Node_Modules", "untrusted.txt"), "must not be copied\n");
      await writeFile(
        join(appPath, "config", "data-handling.yml"),
        "schemaVersion: 1.0.0\nclassification: synthetic\nretentionDays: 30\ndeletionMethod: automatic-expiry\nowner: test-fixture\n",
      );
    }
    await mkdir(join(workRoot, "outside"), { recursive: true });
    await symlink(
      join(workRoot, "outside"),
      join(workRoot, "root", "outside-app"),
      process.platform === "win32" ? "junction" : "dir",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await rm(workRoot, { recursive: true, force: true });
  });

  it("resolves Vitest and npm independently of the subject workspace", async () => {
    const [vitest, npm] = await Promise.all([resolveTrustedVitest(), resolveTrustedNpm()]);
    expect(vitest.command).toBe(process.execPath);
    expect(vitest.argsPrefix).toHaveLength(1);
    await expect(realpath(vitest.argsPrefix[0]!)).resolves.toBe(vitest.argsPrefix[0]);
    await expect(realpath(npm.command)).resolves.toBe(npm.command);
  });

  it.each(layouts)(
    "stages $name source without copying subject dependencies or mutating it",
    async (layout) => {
      const repositoryPath = join(workRoot, layout.name);
      const vitest = await resolveTrustedVitest();
      const source = await resolveWorkspaceDirectory(repositoryPath, layout.appPath);
      const staged = await prepareCollectorWorkspace(
        source,
        join(workRoot, `collector-${layout.name}`),
        vitest.nodeModulesPath,
      );
      try {
        expect(await readFile(join(staged.appPath, "src", "server.ts"), "utf8")).toContain(
          "canApprove",
        );
        await expect(
          readFile(join(staged.appPath, "node_modules", "untrusted.txt"), "utf8"),
        ).rejects.toThrow();
        expect(await realpath(join(staged.root, "repository", "node_modules"))).toBe(
          await realpath(vitest.nodeModulesPath),
        );
        const config = await readFile(staged.configPath, "utf8");
        expect(config).toContain('"include": [\n      "tests/**/*.test.ts"');
        expect(config).not.toContain("src/server.ts");
        expect(
          await readFile(join(staged.root, "repository", "tsconfig.base.json"), "utf8"),
        ).toContain('"strict":true');
        expect(
          await readFile(
            join(repositoryPath, layout.appPath, "Node_Modules", "untrusted.txt"),
            "utf8",
          ),
        ).toBe("must not be copied\n");
      } finally {
        await removeCollectorWorkspace(staged.root);
      }
    },
  );

  it.each(layouts)(
    "collects real Vitest and coverage evidence for a $name application",
    async (layout) => {
      const calls = await mockAudit();
      const repositoryPath = join(workRoot, layout.name);
      const raw = await analyzeFixture(repositoryPath, layout.appPath);
      expect(raw.diagnostics).toEqual([]);
      expect(raw.findings.every((finding) => finding.state === "pass")).toBe(true);
      expect(
        raw.findings.find((finding) => finding.id === FINDING_IDS.testSuite)?.facts,
      ).toMatchObject({
        total: 2,
        passed: 2,
        testCases: [expect.objectContaining({ id: "authorization.non-approver-denied" })],
      });
      expect(
        raw.findings.find((finding) => finding.id === FINDING_IDS.testCoverage)?.facts,
      ).toEqual({
        linesPct: 100,
        functionsPct: 100,
        branchesPct: 100,
        statementsPct: 100,
      });
      const audit = calls.find((call) => call.args.includes("audit"));
      expect(audit?.cwd).toBe(await realpath(repositoryPath));
      expect(audit?.args).toEqual(
        expect.arrayContaining(["--ignore-scripts", "--omit=dev", "--json"]),
      );
      const tests = calls.find((call) => call.args.includes("--coverage"));
      expect(tests).toBeDefined();
      await expect(realpath(tests!.cwd)).rejects.toThrow();
      expect(
        await readFile(join(repositoryPath, layout.appPath, "vitest.config.ts"), "utf8"),
      ).toContain("untrusted Vitest config ran");
    },
    180_000,
  );

  it.each(["missing-app", "outside-app"])(
    "keeps an absent or escaping application path unknown: %s",
    async (appPath) => {
      const calls = await mockAudit();
      const raw = await analyzeFixture(join(workRoot, "root"), appPath);
      for (const id of [
        FINDING_IDS.testSuite,
        FINDING_IDS.testCoverage,
        FINDING_IDS.dataRetention,
      ]) {
        expect(raw.findings.find((finding) => finding.id === id)?.state).toBe("unknown");
      }
      expect(raw.diagnostics.length).toBeGreaterThan(0);
      expect(calls.some((call) => call.args.includes("--coverage"))).toBe(false);
    },
    30_000,
  );

  it("rejects overlapping staging paths before removing or copying any source", async () => {
    const repositoryPath = join(workRoot, "root");
    const source = await resolveWorkspaceDirectory(repositoryPath, ".");
    const vitest = await resolveTrustedVitest();
    for (const collectorPath of [repositoryPath, join(repositoryPath, ".agentproof"), workRoot]) {
      await expect(
        prepareCollectorWorkspace(source, collectorPath, vitest.nodeModulesPath),
      ).rejects.toThrow(/outside the subject repository/);
    }
    expect(await readFile(join(repositoryPath, "src", "server.ts"), "utf8")).toContain(
      "canApprove",
    );
  });
});
