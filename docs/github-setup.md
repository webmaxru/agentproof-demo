# GitHub repository setup

This is the setup and validation record for
[`webmaxru/agentproof-demo`](https://github.com/webmaxru/agentproof-demo), default
branch `main`. It is intentionally **private**, contains synthetic data only,
and imports upstream snapshot `47fdeeb665d930a599a3530958b8e62325647810`.

**Not a claim of full enforcement:** the rulesets and branch-protection APIs
both return HTTP 403: `Upgrade to GitHub Pro or make this repository public to
enable this feature.` The user has not approved public visibility. The desired
ruleset remains checked in without weakening its requirements. A green check
alone must not be narrated as preventing an otherwise permitted merge.

## Verified initial state

| Item                                  | Observed value                                             |
| ------------------------------------- | ---------------------------------------------------------- |
| Repository                            | `webmaxru/agentproof-demo`, `private: true`                |
| Initial empty commit                  | `f4bc8eb8673370b1ea4288d3a061a46a33e933ce`                 |
| Local branch                          | `agentproof-reference-implementation`                      |
| Acting GitHub identity                | `webmaxru`, verified through `gh api user`                 |
| Actions before workflow review        | `enabled: false`, `sha_pinning_required: false`            |
| Default workflow token                | `read`                                                     |
| Actions may approve PR reviews        | `false`                                                    |
| Current collaborator inventory        | `webmaxru` with `admin` role only                          |
| Ruleset/branch-protection entitlement | Both GET requests returned HTTP 403                        |
| Independent approval                  | **HUMAN NOT PERFORMED**; author cannot review their own PR |

The branch-renaming app tool was called first but does not support branch
sessions. `git branch -m agentproof-reference-implementation` performed the
local rename before importing files. The source checkout was not changed.

## Authentication for every network command

The host can inherit a different account through environment variables. In
each fresh PowerShell process, remove only those process-local overrides and
assert the keyring identity before GitHub mutations or Git network operations:

```powershell
Remove-Item Env:GH_TOKEN, Env:GITHUB_TOKEN -ErrorAction SilentlyContinue
$login = gh api user --jq .login
if ($LASTEXITCODE -ne 0 -or $login -ne 'webmaxru') {
  throw "Unexpected GitHub account: $login"
}
```

Do not print tokens, switch the global active account, or use a fallback account.
Issue/PR creation uses the app's dedicated creation tools in this repository
context, not shell creation commands.

Initial read-only commands (after that preamble):

```powershell
gh api repos/webmaxru/agentproof-demo
gh api repos/webmaxru/agentproof-demo/actions/permissions
gh api repos/webmaxru/agentproof-demo/actions/permissions/workflow
gh api repos/webmaxru/agentproof-demo/collaborators
gh api repos/webmaxru/agentproof-demo/rulesets
gh api repos/webmaxru/agentproof-demo/branches/main/protection
```

## 1. Push and inspect the protected base

The imported application is at the root: `src`, `tests`, `config`,
`package.json`, `package-lock.json`, and TypeScript/Vitest configuration.
`packages/evidence-core` and `packages/evidence-cli` are private workspaces.
No plugin checkout is required to build the trusted evaluator.

Validate the complete baseline before initial publication:

```powershell
npm ci --ignore-scripts
npm run check
npm run test:coverage
npm run test:integration
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin HEAD:refs/heads/main
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -u origin agentproof-reference-implementation
```

The first push publishes the initial populated baseline; it is not a PR merge.
Do not treat the currently unprotected base as protected in recording claims.

Before enabling Actions:

1. Inspect every `.github/workflows/*.yml` permission and trigger.
2. Verify every third-party action is pinned to a reviewed full commit SHA.
3. Confirm untrusted analysis receives no secrets/write token.
4. Confirm write-capable publisher/disposition code never executes PR code.
5. Confirm `.github/CODEOWNERS` uses a verified authorized human. `@webmaxru`
   currently owns all paths but cannot independently approve their own PR.
6. Resolve the private-plan entitlement before claiming protection of
   workflows, scripts, policy, app, package manifests, and evidence code.

The reviewed action objects were read successfully from GitHub:

| Action                      | Full pinned commit                         |
| --------------------------- | ------------------------------------------ |
| `actions/checkout`          | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node`        | `820762786026740c76f36085b0efc47a31fe5020` |
| `actions/upload-artifact`   | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |
| `actions/download-artifact` | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` |

Each was checked with
`gh api repos/actions/<action>/git/commits/<full-sha>`.
Analysis installs only **base-revision** dependencies with `npm ci
--ignore-scripts`. It stages the subject as data, uses trusted Vitest and
generated `tests/**/*.test.ts` / `src/**/*.ts` selection, and audits the subject
root lockfile. The publisher installs/builds only base-revision code; it neither
installs subject dependencies nor executes PR package scripts/configuration.
Retention comes from root `config/data-handling.yml`.

## 2. Configure Actions

In **Settings → Actions → General**:

- allow only actions approved by the organization;
- keep workflow permissions read-only by default;
- do not allow Actions to approve pull requests;
- review fork/private-repository execution policy;
- retain logs/artifacts according to approved policy; and
- never add customer or production secrets to this synthetic repository.

The checked-in workflows request job-specific permissions. Organization policy
may further restrict them.

Expected flow:

| Workflow                 | Trigger                                            | Writes                                           |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------ |
| `AgentProof Analysis`    | PR opened/synchronized; trusted manual dispatch    | Raw artifact only; repository/PR read            |
| `AgentProof Publish`     | Successful analysis completion                     | Required check, one PR summary, final artifact   |
| `AgentProof Disposition` | PR comment create/edit/delete; PR metadata refresh | Invalidates and dispatches current-head analysis |
| `AgentProof Revalidate`  | Every six hours/manual                             | Dispatches analysis for current open PRs         |

Applied and read back before initial workflow publication:

| Setting                                   | Verified value                                                 |
| ----------------------------------------- | -------------------------------------------------------------- |
| Actions enabled                           | `true`                                                         |
| Allowed actions                           | `selected`                                                     |
| Full-SHA pinning required                 | `true`                                                         |
| Allow all GitHub-owned / verified actions | Both `false`                                                   |
| Allowed patterns                          | Only the four `actions/<name>@<full-sha>` entries listed above |
| Default workflow permissions              | `read`                                                         |
| Actions may approve reviews               | `false`                                                        |

Exact successful mutation sequence, after the authentication preamble:

```powershell
gh api --method PUT repos/webmaxru/agentproof-demo/actions/permissions/workflow -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false
gh api --method PUT repos/webmaxru/agentproof-demo/actions/permissions -F enabled=true -f allowed_actions=selected -F sha_pinning_required=true
@{
  github_owned_allowed = $false
  verified_allowed = $false
  patterns_allowed = @(
    'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1'
    'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020'
    'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a'
    'actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c'
  )
} | ConvertTo-Json | gh api --method PUT repos/webmaxru/agentproof-demo/actions/permissions/selected-actions --input -
gh api repos/webmaxru/agentproof-demo/actions/permissions
gh api repos/webmaxru/agentproof-demo/actions/permissions/selected-actions
gh api repos/webmaxru/agentproof-demo/actions/permissions/workflow
```

An earlier attempt to set `allowed_actions=selected` with `enabled=false`
returned HTTP 409: `You can't specify 'allowed_actions' unless enabled is true.`
The successful sequence above ran while remote `main` was still the empty
initial commit, before any workflow could execute. No broad action allow-list
was used as a workaround.

## 3. Seed the stable check

Open a harmless PR after Actions are enabled. Wait for the check named exactly:

```text
AgentProof / gate
```

Do not configure a similarly named workflow job as the required check. Inspect
the Check Run summary and download
`agentproof-evidence-pr-<pullRequestNumber>-<headSha>` to confirm it names the
current repository, PR, base policy, and full head SHA.

## 4. Create the ruleset

Open:

```text
https://github.com/webmaxru/agentproof-demo/settings/rules
```

The intended target is `main`; use the exact checked-in
`.github/rulesets/agentproof.json` without bypass actors:

- require a pull request before merge;
- require at least one approval;
- dismiss stale approvals on new commits;
- require review from Code Owners;
- require all conversations resolved;
- require `AgentProof / gate`;
- require `Build, lint, and test`;
- require approval of the last push by a distinct reviewer;
- block force pushes and deletion;
- allow no bypass.

Ensure the author, automation owner, and bot cannot satisfy the independent
approval. GitHub plan/organization options vary; equivalent protected-branch
controls are acceptable only if they enforce the same tested behavior. Both APIs
are currently unavailable on this private repository's plan. No rule was
silently replaced with a weaker protection or represented as enforced.

## 5. Verify policy integrity

Submit a test PR that modifies both risky code and
`policy/release-policy.yml`. Confirm the check applies the policy from the PR's
protected base SHA, records its digest, and does not let the PR relax its own
gate. Confirm protected paths request the configured code owner.

## 6. Acceptance tests

Run these against disposable PRs, respecting the human boundary:

1. Unsafe PR produces dependency `fail`, required authorization-test-marker
   `fail`, and retention `unknown`.
2. Malformed and unauthorized exception comments do not move the gate.
3. A valid comment applies only to an eligible finding and exact current SHA.
4. A remediation commit makes old evidence, dispositions, and approval stale.
5. Editing, deleting, or expiring acceptance returns the gate to blocking.
6. Green gate without independent approval cannot merge.
7. Approval with a red gate cannot merge.
8. Overlapping runs cannot publish a green result for an obsolete SHA.

Items requiring exception submission, editing/deleting an acceptance, genuine
prior approval, independent approval, or merge protection are **HUMAN NOT
PERFORMED** until an authorized human actually exercises them. Automated unit
tests of those semantics are not a substitute for live acceptance.

The unsafe recording PR stays at its first unsafe head. A separate remediation
PR is prepared from that head, restoring the safe dependency and AP-ID marker
while retaining incomplete retention. That separate PR does not itself
demonstrate same-PR stale disposition or stale approval. A human must record the
actual transition later. Never fabricate prior approval for a dismissal shot.

The upstream kit migration is a separate, unmerged human-review boundary.
Before installing its `main` marketplace, a human must merge that migration and
confirm its source entries point to `webmaxru/AgentProof`. An older installed
plugin in another session is not validation of the new kit.

## Live results and recording handoff

### Published baseline

The initial populated baseline is
[`ce9f1b8e33a7bd58ab1b2eb40149070a356fd083`](https://github.com/webmaxru/agentproof-demo/commit/ce9f1b8e33a7bd58ab1b2eb40149070a356fd083).
It was published on `main` and `agentproof-reference-implementation` without a
PR merge. Subsequent setup receipts belong on the project branch and its
reviewable PR, not on the frozen `main`: changing the base SHA invalidates
earlier PR evidence even when the head stays unchanged.

| Receipt                                                           | Actual result                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline GitHub CI                                                | [Run 36787055404](https://github.com/webmaxru/agentproof-demo/actions/runs/36787055404), `Build, lint, and test`: **success**, completed `2026-09-30T22:43:04Z`, head `ce9f1b8e33a7bd58ab1b2eb40149070a356fd083` |
| `npm run check`                                                   | Passed formatting, lint, type checking, builds, and 96 tests: 20 workflow helpers, 7 app, 33 CLI, 36 core                                                                                                        |
| `npm run test:coverage`                                           | Passed; all root `src` included, 93.75% lines/statements, 97.05% branches, 88.88% functions; all policy thresholds remain 80%                                                                                    |
| `npm run test:integration`                                        | Passed: 7 app, 12 CLI, 4 core                                                                                                                                                                                    |
| `npm audit --ignore-scripts --omit=dev --audit-level=high --json` | Safe Fastify 5.12.1: exit 0, no high/critical findings, one moderate finding allowed by unchanged policy; not a vulnerability-free claim                                                                         |
| Actual HTTP smoke                                                 | Health, expense creation, non-approver denial, and authorized approval passed against the loopback server; the temporary server was stopped                                                                      |
| Native tracking-issue comment                                     | [Disposition run 36788040546](https://github.com/webmaxru/agentproof-demo/actions/runs/36788040546) skipped an ordinary comment on issue #2, as intended; no disposition or analysis dispatch resulted           |

The canonical policy identity was independently computed with the built
baseline core from
`git show ce9f1b8e33a7bd58ab1b2eb40149070a356fd083:policy/release-policy.yml`,
using `loadReleasePolicyYaml` and `canonicalSha256`:

```text
schemaVersion: 1.0.0
id: agentproof.release
version: 1.0.0
path: policy/release-policy.yml
baseSha: ce9f1b8e33a7bd58ab1b2eb40149070a356fd083
sha256: e410fd2296d229c99fb80de6422143b3baaf0f4a8174b604b7c1b953b2bf6c4f
```

This digest identifies the selected baseline policy; it does not claim that
GitHub currently enforces protection of that branch. The initial automated
receipt is also preserved in
[recording readiness](https://github.com/webmaxru/agentproof-demo/issues/2#issuecomment-5921098037).

### PR evidence

These are actual GitHub results observed on `2026-09-30`, not fixture output.
Every subject below has the same frozen base and policy identity recorded above.
The unsafe and remediation heads remain fixed. The setup row deliberately
records its **initial** positive-path head: later documentation/capture-helper
updates receive fresh checks, with the current-head receipt recorded in
[readiness issue #2](https://github.com/webmaxru/agentproof-demo/issues/2) rather
than embedding a self-referential commit SHA in this file.

| Subject                       | PR                                                       | Full head SHA                              |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------ |
| Initial harmless setup        | [#4](https://github.com/webmaxru/agentproof-demo/pull/4) | `dea6d65ead787e0c1bc3fdf210230d2a9f619ddf` |
| Frozen unsafe recording       | [#5](https://github.com/webmaxru/agentproof-demo/pull/5) | `e445241ec7a8cd913eeb50b0798c03d46816b629` |
| Separate prepared remediation | [#6](https://github.com/webmaxru/agentproof-demo/pull/6) | `830d2589cee7ab9b2db4b3afa1c93f25ca2b6c73` |

| Subject       | CI: Build, lint, and test                                                                    | Analysis                                                                                     | Publisher                                                                                             | AgentProof / gate                  |
| ------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Initial setup | [36789738759](https://github.com/webmaxru/agentproof-demo/actions/runs/36789738759): success | [36789738878](https://github.com/webmaxru/agentproof-demo/actions/runs/36789738878): success | [36789784985](https://github.com/webmaxru/agentproof-demo/actions/runs/36789784985): success          | success; 6 pass                    |
| Unsafe        | [36789830299](https://github.com/webmaxru/agentproof-demo/actions/runs/36789830299): success | [36789830447](https://github.com/webmaxru/agentproof-demo/actions/runs/36789830447): success | [36789882094](https://github.com/webmaxru/agentproof-demo/actions/runs/36789882094): expected failure | failure; 3 pass, 2 fail, 1 unknown |
| Remediation   | [36791206333](https://github.com/webmaxru/agentproof-demo/actions/runs/36791206333): success | [36791206260](https://github.com/webmaxru/agentproof-demo/actions/runs/36791206260): success | [36791264418](https://github.com/webmaxru/agentproof-demo/actions/runs/36791264418): expected failure | failure; 5 pass, 1 unknown         |

The blocking publishers passed provenance, metadata, evaluation, artifact
upload, and check publication. Their only failing step was
`Reflect a blocking gate in workflow status`. This is a valid blocking result,
not an infrastructure failure or a passing workflow.

The unsafe artifact contains exactly these unresolved findings:

- `AP-SEC-NPM-AUDIT-001`: **fail**, actual audit exit 1, one high and one
  moderate dependency finding with Fastify 5.8.4.
- `AP-TEST-AUTHORIZATION-001`: **fail**, required AP-ID absent. All seven
  behavioral tests still passed; neither the authorization assertions nor the
  application behavior was removed.
- `AP-POL-RETENTION-001`: **unknown**, only `deletionMethod` is missing.

Remediation is a direct child of the frozen unsafe commit, targeting `main`.
Its manifest, lockfile, runtime source, and complete tests match the safe
baseline exactly. Its only diff against `main` is the missing `deletionMethod`.
Dependency and AP-ID findings therefore pass in real evidence, but retention
remains **unknown** and blocking. No exception was accepted to create either
result.

#### Immutable artifact receipts

All three final documents have schema `1.0.0`, self-declared `GitHub Copilot`
origin, no diagnostics, no dispositions, and no advisory reviewer fragments.
The current native comment lists contained only the owned GitHub Actions gate
summaries; the native review lists were empty. Each `validUntil` is `null`
because there is no accepted-exception expiry; this is not perpetual freshness
or approval. Revalidate the current head, base, comments, checks, and artifacts
immediately before recording.

| Subject       | Native check ID (GitHub Actions app `15368`) | Artifact ID   | Generated / evaluated at   |
| ------------- | -------------------------------------------- | ------------- | -------------------------- |
| Initial setup | `110139921538`                               | `11131656319` | `2026-09-30T23:12:21.167Z` |
| Unsafe        | `110140197835`                               | `11131196484` | `2026-09-30T23:13:17.345Z` |
| Remediation   | `110144629433`                               | `11131634272` | `2026-09-30T23:29:02.573Z` |

Artifact names are exactly
`agentproof-evidence-pr-<PR_NUMBER>-<FULL_HEAD_SHA>`, using the identities above.
Canonical JSON evidence digests were verified with `parseAndVerifyEvidence`
from the built baseline core, independently of the archive digest reported by
GitHub:

| Subject       | Verified canonical evidence SHA-256                                | GitHub-reported archive digest                                            |
| ------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Initial setup | `a092ec9ea120efeb065d82754a10752636cca13909388e6429a61ecb3d1b8f0a` | `sha256:070787b964528ef767c33c61c89fa5555ba165272be509b97911de54dc24a2f4` |
| Unsafe        | `c43901afa2ae62b02ad80b44c1abd35b20253fee4cecfd495c6f3e317c0313a9` | `sha256:dbfebec19dd38057630d54d95c555216cc0e415bf1ead3d2cad31112249b3c82` |
| Remediation   | `d91686a70abb9011ae8e7daed2e89ed3d0f9db6581f9a60f8ddeecf6eecec339` | `sha256:3acb77a69afd286d601a027281f9b9a2293a663b64e894262975e3f41c1a7175` |

These are different digest types; neither a raw-file hash nor the ZIP digest
was substituted for the canonical evidence digest. Verification checked the
exact repository/PR/base/head, policy path/version/digest, all finding SHAs,
gate counts/blockers, native check app/conclusion/digest, workflow path/event/
conclusion, artifact identity, and unchanged live PR identity before and after.

Selected exact read-only commands and results, after the authentication
preamble, from the reference repository root:

```powershell
# Passed: native current-head checks and the expected publisher failure step.
gh api repos/webmaxru/agentproof-demo/commits/e445241ec7a8cd913eeb50b0798c03d46816b629/check-runs
gh api repos/webmaxru/agentproof-demo/actions/runs/36789882094/jobs
gh api repos/webmaxru/agentproof-demo/actions/runs/36791264418/jobs

# Passed: exact final artifacts downloaded into ignored local storage.
gh run download 36789784985 --repo webmaxru/agentproof-demo --name agentproof-evidence-pr-4-dea6d65ead787e0c1bc3fdf210230d2a9f619ddf --dir .agentproof\live-validation\pr-4
gh run download 36789882094 --repo webmaxru/agentproof-demo --name agentproof-evidence-pr-5-e445241ec7a8cd913eeb50b0798c03d46816b629 --dir .agentproof\live-validation\pr-5

# Passed with the reviewed kit overlay on the clean frozen base:
# VERIFIED_READ_ONLY_SNAPSHOT_NOT_APPROVAL, 5 pass / 1 unknown.
node hackathon-2026\assets\recording-kit\capture-state.mjs --pr 6
```

The unsafe Windows checkout had two disclosed aggregate `npm run check`
failures at the unchanged 10-second health-test startup hook. Its standalone
`npm run test:app -- --reporter=verbose` passed 7/7 at default timeouts;
`npm run build` passed; local coverage passed with the explicitly disclosed
CLI-only `--hookTimeout=60000`. No test configuration, assertions, thresholds,
or policy was relaxed. Its real Linux CI subsequently passed the full,
unchanged-default aggregate command. Remediation's standalone default-timeout
app suite and build passed without a retry; its actual audit returned exit 0,
zero high/critical, and one allowed moderate finding.

#### Presenter helper integration finding

The first live safe capture correctly stopped because the original helper
expected `check.details_url` to be a workflow-run URL. Native GitHub returned
`https://github.com/webmaxru/agentproof-demo/runs/<CHECK_ID>` instead. The
reviewed helper now resolves exactly one publisher footer from the authentic
check summary, verifies the run and artifact independently, and accepts only
that canonical publisher URL or the exact native check page in `details_url`.
It never treats a check ID as a workflow-run ID.

Real fixed-helper captures passed for the initial safe, unsafe, and remediation
subjects. The helper rejects changes outside the reviewed recording-kit
overlay and still requires the exact live PR base checkout before importing
the evaluator. Follow the
[recording-kit overlay procedure](../hackathon-2026/assets/recording-kit/README.md#refresh-presenter-evidence-before-recording)
while the setup PR is unmerged. This preserves the frozen base rather than
weakening the identity check or advancing `main`.

#### Remaining human and plan checks

| Check                                                                          | Actual status                                                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Ruleset / branch protection and enforced merge behavior                        | **BLOCKED BY PLAN**: private APIs return 403; no enforcement claimed                                                      |
| Designate a distinct authorized reviewer and obtain independent approval       | **HUMAN NOT PERFORMED**; sole current collaborator is the author                                                          |
| Submit, edit, delete, or expire a real eligible acceptance                     | **HUMAN NOT PERFORMED**; no exception comments posted                                                                     |
| Advance the same unsafe PR after recording its first exception                 | **HUMAN NOT PERFORMED**; unsafe head remains frozen, separate remediation is not this demonstration                       |
| Dismiss an actual prior approval after a head update                           | **HUMAN NOT PERFORMED**; no prior approval was fabricated                                                                 |
| Live policy-tampering / overlapping-publication acceptance exercise            | **NOT PERFORMED LIVE**; trusted-base paths and automated rejection tests were checked, not represented as live acceptance |
| Fresh advisory specialists / assembled reviewer fragments                      | **NOT RUN**; no generated notes represented as specialist output                                                          |
| Upstream kit migration merge and newly installed `main` marketplace validation | **HUMAN NOT PERFORMED**; old installed plugin is not evidence of the new kit                                              |
| Live footage, narration, final master, and privacy sign-off                    | **HUMAN NOT PERFORMED**; precomputed assets remain labeled                                                                |

Tracking issues:

- [Recording readiness](https://github.com/webmaxru/agentproof-demo/issues/2)
- [Unsafe recording scenario](https://github.com/webmaxru/agentproof-demo/issues/1)
- [Remediation transition](https://github.com/webmaxru/agentproof-demo/issues/3)

A final recording remains human work: real captures, eligible current-SHA
exceptions, independently authorized review, final narration/captions, privacy
review, and any final master. Historical/synthetic material must retain
**PRECOMPUTED / NOT LIVE** throughout.

Record non-sensitive screenshots only after hiding account notifications and
unrelated repository data. GitHub records are authoritative; screenshots are
demonstration media.

## Optional protected release environment

A protected environment can add a final post-merge human release approval.
Keep it distinct from PR approval and `AgentProof / gate`. It is optional and
must not be described as part of the working MVP unless tested on the target
GitHub plan.
