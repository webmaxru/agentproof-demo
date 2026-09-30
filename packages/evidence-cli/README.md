# `@agentproof/evidence-cli`

`--workspace` always names the subject repository root. The default
application is that root (`appPath: "."`), while `npm audit` reads the root
`package.json` and root `package-lock.json`.

## Analyze metadata

Workflow mode requires exactly these identity fields:

```json
{
  "schemaVersion": "1.0.0",
  "repository": "owner/repository",
  "pullRequestNumber": 1,
  "baseSha": "1111111111111111111111111111111111111111",
  "headSha": "2222222222222222222222222222222222222222"
}
```

`appPath` is optional and defaults to `"."`. Legacy `samplePath` remains an
accepted alias; supplying different values for both is rejected. Workflows
select the path through trusted `APPLICATION_PATH` in
`.github/scripts/workflow-helpers.mjs`, never from a PR-controlled setting.
`pullRequestBody` is optional and defaults to `""`, which produces unknown
origin evidence. The following bounded audit fields are optional:
`pullRequestUrl`, `author`, `authorAssociation`, `baseRef`, and `headRef`.
Unknown properties are rejected. The machine-readable contract is
`schemas/analyze-metadata-v1.schema.json`.

Report mode is the schema's second variant. It requires `generatedAt`,
`workflowRunUrl`, `origin`, `tools`, and `sources`. `sources` must contain
Vitest `reportPath`, `coveragePath`, and `command`; npm-audit `reportPath` and
`command`; and data-retention `declarationPath`. Paths are repository-relative
or `null`; commands contain exactly `exitCode` and `error`.

## Trusted collection

Workflow mode resolves npm and Vitest from the trusted CLI runtime. It never
runs subject package scripts and never installs subject dependencies. npm audit
runs with `--ignore-scripts --omit=dev --audit-level=high --json` at the
repository root. The application tree is copied into a unique OS-temporary
collector directory outside the subject, linked to trusted dependencies, and
tested with a generated configuration selecting `tests/**/*.test.ts` and all
`src/**/*.ts` for coverage. Overlapping collector/subject directories are
rejected. The directory is removed afterward;
the pull-request checkout and its tooling remain unchanged.

The trusted checkout must already have been installed from its protected
lockfile. The subject root `package-lock.json` must be present and synchronized
with its manifests; otherwise npm audit becomes unknown. Tests resolve only the
trusted installation, so a subject dependency unavailable there also becomes
unknown rather than triggering an install or using PR-controlled tooling.

Any missing tool, command failure, absent report, malformed report, invalid
application path, or collector orchestration error produces schema-valid findings
with `state: "unknown"` plus error diagnostics. `analyze` still writes and
hashes the raw artifact and exits successfully. Invalid top-level metadata
cannot identify a commit-bound artifact and is therefore a CLI error.

## Commands and exit codes

```text
agentproof analyze --workspace <repository-root> --metadata <json> --output <json>
agentproof evaluate --evidence <json> --policy <yml> --dispositions <json> --output <json>
agentproof assemble --fragments <final.json> <review.json...> --output <json>
```

Successful analysis/assembly exits `0`; evaluation exits `0` for a green gate
and `2` for a valid blocking result. Input or engine errors exit `1`.
