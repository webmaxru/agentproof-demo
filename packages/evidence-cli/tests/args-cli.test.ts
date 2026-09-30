import { describe, expect, it } from "vitest";

import { parseCliArgs } from "../src/args.js";
import { runCli } from "../src/cli.js";
import { parseAnalyzeMetadata } from "../src/metadata.js";

describe("stable CLI surface", () => {
  it("parses the three documented commands", () => {
    expect(
      parseCliArgs([
        "analyze",
        "--workspace",
        ".",
        "--metadata",
        "meta.json",
        "--output",
        "raw.json",
      ]),
    ).toMatchObject({ command: "analyze", metadataPath: "meta.json" });
    expect(
      parseCliArgs([
        "evaluate",
        "--evidence",
        "raw.json",
        "--policy",
        "policy.yml",
        "--dispositions",
        "comments.json",
        "--output",
        "final.json",
      ]),
    ).toMatchObject({ command: "evaluate", policyPath: "policy.yml" });
    expect(
      parseCliArgs([
        "assemble",
        "--fragments",
        "final.json",
        "review.json",
        "--output",
        "assembled.json",
      ]),
    ).toMatchObject({ command: "assemble" });
  });

  it("rejects missing, duplicate, and unknown flags", () => {
    expect(() => parseCliArgs(["analyze", "--workspace", "."])).toThrow();
    expect(() =>
      parseCliArgs([
        "analyze",
        "--workspace",
        ".",
        "--workspace",
        ".",
        "--metadata",
        "meta.json",
        "--output",
        "raw.json",
      ]),
    ).toThrow();
    expect(() => parseCliArgs(["other"])).toThrow();
  });

  it("returns a stable JSON error envelope", async () => {
    const stderr: string[] = [];
    const code = await runCli(["unknown"], {
      stdout: () => undefined,
      stderr: (value) => stderr.push(value),
    });
    expect(code).toBe(1);
    expect(JSON.parse(stderr.join("")) as unknown).toMatchObject({
      schemaVersion: "1.0.0",
      error: { code: "AP_CLI_ARGUMENT_INVALID" },
    });
  });

  it("accepts the bounded GitHub pull request metadata contract", () => {
    const identity = {
      schemaVersion: "1.0.0",
      repository: "agentproof/example",
      pullRequestNumber: 7,
      baseSha: "1".repeat(40),
      headSha: "2".repeat(40),
    };
    expect(parseAnalyzeMetadata(identity)).toMatchObject({
      pullRequestBody: "",
      appPath: ".",
    });
    expect(parseAnalyzeMetadata({ ...identity, appPath: "services/api" })).toMatchObject({
      appPath: "services/api",
    });
    expect(parseAnalyzeMetadata({ ...identity, samplePath: "services/api" })).toMatchObject({
      appPath: "services/api",
    });
    expect(
      parseAnalyzeMetadata({ ...identity, appPath: "services/api", samplePath: "services/api" }),
    ).toMatchObject({ appPath: "services/api" });
    expect(() =>
      parseAnalyzeMetadata({ ...identity, appPath: ".", samplePath: "services/api" }),
    ).toThrow();
    for (const appPath of ["../app", "/app", "C:\\app", "C:app", "app\\..\\other", "app\0"]) {
      expect(() => parseAnalyzeMetadata({ ...identity, appPath })).toThrow();
      expect(() => parseAnalyzeMetadata({ ...identity, samplePath: appPath })).toThrow();
    }
    expect(() => parseAnalyzeMetadata({ ...identity, unexpected: true })).toThrow();
  });
});
