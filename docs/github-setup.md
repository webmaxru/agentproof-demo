# GitHub repository setup

This is the setup and validation record for
[`webmaxru/agentproof-demo`](https://github.com/webmaxru/agentproof-demo), default
branch `main`. It is now **public**, contains synthetic data only,
and imports upstream snapshot `47fdeeb665d930a599a3530958b8e62325647810`.

## Current installed state: 2026-10-01

Native repository/ruleset/branch reads confirm the installed state after the
human merges of onboarding PR #9 and setup PR #4. The no-bypass delivery rules
remain active. The follow-up old-base repair described below is a new candidate,
not an agent-authorized deployment.

| Item                        | Verified current value                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visibility                  | `public`, `private: false`                                                                                                                                    |
| Protected main              | `protected: true`, `28f185f710848cf20a2c4c047f5499583c7fdcb2`                                                                                                 |
| Ruleset                     | `24293848`, `AgentProof protected delivery`, `active`, target `~DEFAULT_BRANCH`                                                                               |
| Required checks             | Strict `AgentProof / gate` and `Build, lint, and test`, both GitHub Actions app `15368`                                                                       |
| Pull-request rules          | One approving code-owner review, last-push approval, stale-review dismissal, resolved threads; native extra approval for unattributed changes remains enabled |
| Bypass / destructive pushes | No bypass actors; deletion and force pushes blocked                                                                                                           |
| Actions                     | Same four selected full-SHA pins; default token `read`; automated review approval and broad GitHub-owned/verified allowances remain disabled                  |
| Protected CODEOWNERS        | Both `@webmaxru` and `@vibeprogrammer`; an author still cannot independently approve their own PR                                                             |
| Workflow repair             | PR #4 installed; PR #10 metadata refresh verified; batch old-base PR #5/#6 revalidation failed before Publisher dispatch                                      |
| Runtime dependency          | Active root manifest and resolved installation are Fastify `5.12.5`; frozen PR #5/#6 dependencies are not changed by main's update                            |

Read-only commands used for the current state, after the authentication
preamble below:

```powershell
gh api repos/webmaxru/agentproof-demo
gh api repos/webmaxru/agentproof-demo/rulesets/24293848
gh api repos/webmaxru/agentproof-demo/rules/branches/main
gh api repos/webmaxru/agentproof-demo/branches/main
```

The ruleset and effective branch rules are real enforcement facts. They are
not evidence of the recording scenarios' human decisions. PR #9 merged at
`2026-10-01T10:27:04Z`; PR #4 merged at `2026-10-01T10:36:15Z`.
PR #5, PR #6, and smoke PR #10 remain **DRAFT** with their heads unchanged.
Draft-disabled Merge is not a required-check or independent-review test.

The new repair still requires independent human review and protected-main
rollout. Preserve both installed owners, all policy thresholds, and all active
controls. Do not reopen merged PR #4 or repeat its earlier onboarding steps.
After the old-base repair is installed and verified, a human operator may
ready recording PR #5 for actual review shots, then wait for fresh evidence.
No ready transition, exception, approval, merge, or frozen-head change is part
of this implementation.

## Historical runtime audit and installed narrow remediation

The post-freeze check on intermediate setup head
`f6df4419436d44168ef4aac574ac08388eb1c7f2` found genuine advisory drift:
Fastify `5.12.1`, which passed the earlier recorded audit, now has high
advisories including `GHSA-667r-xxjv-c9mm`, `GHSA-p68q-wchp-6fh7`,
`GHSA-hwr6-493r-vm6h`, and `GHSA-9q9j-q6p8-xq58`. It is not a collector
failure or an acceptable exception. Historical safe/remediation receipts below
must not be reused as current dependency evidence.

| Intermediate-head receipt                                                                     | Verified result                                                                                                          |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [CI 36835617187](https://github.com/webmaxru/agentproof-demo/actions/runs/36835617187)        | `npm run check` passed 112 tests: 36 workflow, 7 app, 33 CLI, and 36 core                                                |
| [Analysis 36835615798](https://github.com/webmaxru/agentproof-demo/actions/runs/36835615798)  | Success on the installed protected base                                                                                  |
| [Publisher 36835662399](https://github.com/webmaxru/agentproof-demo/actions/runs/36835662399) | Only the final intentional blocking-status step failed                                                                   |
| Native gate / artifact                                                                        | Check `110282525391`, artifact `11148892730`; 5 pass, 1 fail, no unknown or exception; unresolved `AP-SEC-NPM-AUDIT-001` |
| Canonical evidence SHA-256                                                                    | `ee86e29f2009b30b7a2dc3aa558105e4200405c4334a339955ef5da9aaba1797`                                                       |
| GitHub archive digest                                                                         | `sha256:19a4b0ede87e8235d725b2e48d83b9ff27607928e4e207b0e6826fec9420a759`                                                |

The canonical verifier checked that artifact against its full head, installed
base `ce9f1b8e33a7bd58ab1b2eb40149070a356fd083`, protected policy digest, and
frozen PR body. These are historical intermediate-head receipts, not the final
patched head's results.

The separate dependency commit `f2d89fd432658753346e152a2f20cbdd030cf8ff`
changes only the exact root Fastify pin and its lockfile resolution/integrity,
from `5.12.1` to `5.12.5`. No unrelated package resolution, policy threshold,
application source, or test assertion is changed.

| Exact command                                                                                      | Result                                                                             |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm audit --ignore-scripts --omit=dev --audit-level=high --json` before the patch                 | Exit 1; one high and one moderate affected production dependency                   |
| `npm pkg set dependencies.fastify=5.12.5` then `npm install --ignore-scripts --no-audit --no-fund` | Completed; only `package.json` and the root Fastify lockfile entries changed       |
| `npm audit --ignore-scripts --omit=dev --audit-level=high --json` after the patch                  | Exit 0; no high/critical findings, one allowed moderate `fast-uri` finding         |
| `npm run typecheck`                                                                                | Passed for the app and both workspaces                                             |
| `npm run build:app`                                                                                | Passed                                                                             |
| `npm run test:coverage`                                                                            | All 7 app tests passed; 93.75% lines/statements, 97.05% branches, 88.88% functions |
| `npm ls fastify --all`                                                                             | Only the active root `fastify@5.12.5` resolution                                   |

This narrow patch landed with PR #4 at protected main
`28f185f710848cf20a2c4c047f5499583c7fdcb2`. The commands above remain the
original patch's receipts, not newly executed scans. Frozen PR #6 still declares `5.12.1`:
its earlier retention-only blocking result is historical, and its standalone
head is not a current passing dependency remediation.

## Historical initial state: 2026-09-30

The following private-repository observations remain historical receipts, not
the current enforcement state. Both ruleset/protection APIs then returned
HTTP 403: `Upgrade to GitHub Pro or make this repository public to enable this feature.`

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

Those pushes were the initial populated publication, not a PR merge, before
the now-active ruleset. Do not repeat them to deploy a candidate repair.
Subsequent changes must follow protected-main human review and rollout.

Before enabling Actions:

1. Inspect every `.github/workflows/*.yml` permission and trigger.
2. Verify every third-party action is pinned to a reviewed full commit SHA.
3. Confirm untrusted analysis receives no secrets/write token.
4. Confirm write-capable publisher/disposition code never executes PR code.
5. Preserve `.github/CODEOWNERS` with both `@webmaxru` and `@vibeprogrammer`.
   Neither author can independently approve their own PR.
6. Verify native effective rules for workflows, scripts, policy, app, package
   manifests, and evidence code; checked-in JSON alone is not enforcement.

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
root lockfile. The old-base repair candidate separates current protected orchestration/core
validation from the immutable PR-base evaluator and policy. Neither publisher
checkout installs subject dependencies or executes PR package scripts/configuration.
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

Installed flow from PR #4 (the remaining old-base gap is tracked in issue #7):

| Workflow                 | Trigger                                                         | Writes                                                 |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------------------ |
| `AgentProof Analysis`    | PR opened/synchronized; trusted manual dispatch                 | Raw artifact only; repository/PR read                  |
| `AgentProof Publish`     | Non-controller analysis completion or exact controller dispatch | Required check, one PR summary, final artifact         |
| `AgentProof Disposition` | PR comment create/edit/delete; PR metadata refresh              | Invalidates and dispatches current-head analysis       |
| `AgentProof Revalidate`  | Every six hours/manual/repository dispatch                      | Dispatches Analysis, then exact Publisher for open PRs |

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

This exact definition is now active as ruleset `24293848`; native effective
branch rules and `protected: true` were read back. The earlier private-plan
403 is retained only in the historical receipt. No weaker rule or bypass was
substituted. Both installed code owners remain named; actual scenario approval
must still come from a distinct authorized human.

## Automatic-refresh rollout and remaining old-base repair

Issue [#7](https://github.com/webmaxru/agentproof-demo/issues/7) records a
historical bot-dispatched Analysis with no following Publisher. The original
handoff repair was installed by the human merge of PR #4. The receipts below
distinguish the verified same-base path from the newly confirmed old-base
failure; issue #7 remains open.

### Installed PR #4 and verified rollout step 5

PR #4 imported the upstream repair from
`8b7f5c5de64a66c24a4d24e928355130757e38f0`, with the context-free native
Publisher validator from `95f68dc2e5284348cbb24b7d8391946aa9305b96`.
The actual PR #10 metadata refresh completed this native chain:

| Stage               | Native receipt                                                                      | Result                                                            |
| ------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Metadata controller | [36852189875](https://github.com/webmaxru/agentproof-demo/actions/runs/36852189875) | Successful `pull_request_target` Disposition                      |
| Bot Analysis        | [36852205009](https://github.com/webmaxru/agentproof-demo/actions/runs/36852205009) | Successful `workflow_dispatch`, exact GitHub Actions bot identity |
| Explicit Publisher  | [36852262081](https://github.com/webmaxru/agentproof-demo/actions/runs/36852262081) | Successful `workflow_dispatch` on protected `main`                |

The immutable smoke subject is PR #10 head
`f091bdc0fd7e90b57f7edc100931e3c3b79c2525`, base
`28f185f710848cf20a2c4c047f5499583c7fdcb2`. This is a genuine installed
automatic-refresh result, not an owner-origin substitute or a local fixture.

### Rollout step 6: partial batch failure

Repository-dispatch batch
[36852396567](https://github.com/webmaxru/agentproof-demo/actions/runs/36852396567)
finished **failure**. Its successful PR #10 matrix job does not validate the
failed PR #5/#6 jobs.

| Subject | Analysis                                                                                     | Following Publisher / controller result                                                                              |
| ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| PR #10  | [36852422551](https://github.com/webmaxru/agentproof-demo/actions/runs/36852422551), success | [36852478120](https://github.com/webmaxru/agentproof-demo/actions/runs/36852478120), success; native gate has 6 pass |
| PR #5   | [36852421743](https://github.com/webmaxru/agentproof-demo/actions/runs/36852421743), success | Controller failed before Publisher dispatch; gate left pending                                                       |
| PR #6   | [36852426150](https://github.com/webmaxru/agentproof-demo/actions/runs/36852426150), success | Controller failed before Publisher dispatch; gate left pending                                                       |

Both old-base Analyses used the correct bot identity and uploaded raw artifacts.
The installed controller incorrectly equated native dispatch workflow
`head_sha` `28f185f710848cf20a2c4c047f5499583c7fdcb2` with the immutable
PR/policy base `ce9f1b8e33a7bd58ab1b2eb40149070a356fd083`.
PR #5 head remains `e445241ec7a8cd913eeb50b0798c03d46816b629`; PR #6 head
remains `830d2589cee7ab9b2db4b3afa1c93f25ca2b6c73`. Neither is advanced to
hide the defect. Fresh publication is expected to remain blocking for their
real findings, including PR #6's now-vulnerable dependency, not turn them green.

### New candidate and human rollout boundary

The follow-up candidate independently resolves the native default-branch
workflow revision, anchors genuine workflow context to that revision, and
rechecks native repository/default branch, run/attempt, source identity, and
subject metadata at handoff and before publication. Policy, evaluator, raw/final
evidence base, and all finding source SHAs remain bound to the real immutable
PR base/head. Native `pull_request_target` run `head_sha` is the PR head;
native `workflow_dispatch` run `head_sha` is the workflow revision. They are
not interchangeable.

Current protected bootstrap publication/disposition scripts and validators run
separately from the old PR-base evaluator/policy checkout. An old policy-base
`publish-check.mjs` cannot silently skip newer source-attempt or handoff checks.
No synthetic event/context, PR-controlled workflow ref, new credential, or
permission expansion substitutes for native provenance. All shared scripts and
their active workflow wiring must roll out together under human review.

The existing bounded dispatch uses REST API `2026-03-10` exact run details,
not latest-run heuristics or a 204-success fallback. Controllers wait for the
exact Analysis attempt, then release their per-PR gate lock without waiting
for Publisher. Their 25-minute job limit and four-way batch bound remain.
The earlier owner-origin API probe, Analysis `36829925551` at
`2026-10-01T07:22:14Z`, remains historical contract evidence only.

The coordinator's consolidated
[public-enforcement and rollout receipt](https://github.com/webmaxru/agentproof-demo/issues/2#issuecomment-5926903886)
retains earlier setup history. The new scoped PR carries exact candidate
commands/results and its immutable head, without rewriting earlier receipts.

Local mocked regression tests and PR CI validate the candidate only.
PR-triggered trusted Analysis/Publish still run the installed base revision;
any green result must not be presented as execution of the candidate
privileged workflow. Do not execute PR workflow code with a write token,
update `main`, merge, or simulate a human exception to bypass rollout.

Historical PR #4 candidate checks, retained as their original receipts:

| Exact command                                                                                                                | Result                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `node --test .github\scripts\github-api.test.mjs`                                                                            | Passed 36 tests: shared controller/provenance regressions plus presenter success/blocking, stale/native identity, and missing-validator cases |
| `node .\node_modules\eslint\bin\eslint.js --no-ignore .github\scripts hackathon-2026\assets\recording-kit\capture-state.mjs` | Passed                                                                                                                                        |
| `node --check hackathon-2026\assets\recording-kit\capture-state.mjs`                                                         | Passed                                                                                                                                        |
| `node hackathon-2026\assets\recording-kit\capture-state.mjs --help`                                                          | Passed without GitHub mutation                                                                                                                |
| `python hackathon-2026\assets\recording-kit\generate_assets.py --verify-only`                                                | Passed structural/media checks and refreshed LF-safe manifest; no deck/image/video/caption regeneration                                       |
| `git diff --check`                                                                                                           | Passed                                                                                                                                        |

Changed Markdown/MJS/YAML/JSON files also passed the installed Prettier check.
The follow-up repair does not regenerate deck/video/slides/captions or change
application/runtime dependencies, retention declarations, policy thresholds,
action pins, Analysis isolation, CI definition, CODEOWNERS, or delivery rules.
Recording-kit text changes require LF-safe manifest regeneration and exact
committed Git-blob hash/size verification.

The new candidate imports source
`a7bd2c29cbe77f4930ee216296205dda110766a6`
([webmaxru/AgentProof#4](https://github.com/webmaxru/AgentProof/pull/4)); all ten
mapped runtime files match that immutable handoff. Focused reference validation:

| Exact command                                                                                                                                                                | Candidate result                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `node --test --test-reporter=spec .github\scripts\github-api.test.mjs`                                                                                                       | Passed 48/48, including 10 presenter cases                                                                                                     |
| `npm run test:integration --workspace @agentproof/evidence-cli`                                                                                                              | Passed 25/25, including real Publisher entrypoint and pre-write race regressions                                                               |
| `npm run typecheck --workspace @agentproof/evidence-cli`                                                                                                                     | Passed                                                                                                                                         |
| `npm run build --workspace @agentproof/evidence-core --workspace @agentproof/evidence-cli`                                                                                   | Passed                                                                                                                                         |
| `node .\node_modules\eslint\bin\eslint.js --no-ignore .github\scripts hackathon-2026\assets\recording-kit\capture-state.mjs packages\evidence-cli\tests\integration.test.ts` | Passed                                                                                                                                         |
| `node --check hackathon-2026\assets\recording-kit\capture-state.mjs`                                                                                                         | Passed                                                                                                                                         |
| `node hackathon-2026\assets\recording-kit\capture-state.mjs --help`                                                                                                          | Passed without GitHub access                                                                                                                   |
| `node hackathon-2026\assets\recording-kit\capture-state.mjs --pr 5`                                                                                                          | Expected exit 1: GET-only preflight rejected the undeployed candidate checkout before validator import or presenter output; not a live capture |
| `python hackathon-2026\assets\recording-kit\generate_assets.py --verify-only`                                                                                                | Passed; only LF-safe manifest refreshed, media unchanged                                                                                       |
| `git diff --check`                                                                                                                                                           | Passed                                                                                                                                         |

Only declared dependencies were restored after the initial test reported a
missing `yaml` package; package manifests and lockfile were not changed.
Native candidate CI is recorded on the new scoped PR, not substituted for
post-rollout execution of the repaired privileged workflows.

Keep issue #7 open after candidate publication and human merge until actual
old-base bot Analysis and explicit Publisher runs produce completed,
correctly blocking checks/artifacts on the unchanged heads. Verify the other
comment/batch paths separately; one successful matrix job is not full batch
success. Record both the deployed workflow revision and the subject's
independently resolved base/head/policy/evidence.

The strict required-check rule also requires branches to incorporate current
main before merge. That is distinct from revalidating an older immutable
evidence base. A main update does not itself advance these frozen PR heads/bases.
Do not advance frozen PR #5/#6 now or update the unsafe PR before its first
recorded human disposition. During the later authorized recorded transition,
incorporate the then-current protected main while preserving its owners,
controls, workflows, and reviewed runtime dependency/lock fixes. Prepared remediation head
`830d2589cee7ab9b2db4b3afa1c93f25ca2b6c73` is not automatically the final
up-to-date unsafe-PR head, and its Fastify `5.12.1` resolution is now affected.
The later recorded head must include the current reviewed dependency patch
as well as the prepared authorization-marker restoration. Resolve the actual
resulting full base/head and collect new evidence; neither old-base artifacts
nor previous review count as proof for that revision.

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

This digest identifies the selected baseline policy. Native enforcement is
verified separately in the current-state section; the digest does not prove
enforcement by itself. The initial automated
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

The previously reviewed `b44e2e892945b6cecbbe6e08c8f8d8c2a3b04e6b` helper passed
real captures for the initial safe, unsafe, and remediation subjects. Those
are historical installed-baseline results, not tests of the new bot handoff.
The PR #4 helper incorrectly required its local checkout and Publisher workflow
SHA to equal the frozen PR policy base. Neither it nor the legacy
`workflow_run`-only helper verifies a fresh current-default explicit Publisher
for an old-base PR.

The new candidate uses a clean checkout of the **current protected default
workflow revision**, independently verified through native branch and git-ref
GETs, for its core parser and native-only validators. It binds native app
`15368`, the exact check header/trailing Publisher footer, registered workflow,
repository/default branch, run/attempt, artifact provenance, and canonical
digest. Policy is read as data at the real PR base; evidence and every finding
retain the full subject SHAs. It rechecks the checkout/default branch,
subject/body, native Publisher attempt, artifact, and latest gate after download.
It neither fabricates event/context nor claims unexposed Analysis dispatch inputs.
The installed `28f185f710848cf20a2c4c047f5499583c7fdcb2` checkout lacks the new
shared workflow-revision resolver, so this candidate still requires human
rollout. Do not overlay workflow/evaluator scripts to bypass that guard.
Only a reviewed recording-kit overlay is permitted.
Follow the
[recording-kit overlay procedure](../hackathon-2026/assets/recording-kit/README.md#refresh-presenter-evidence-before-recording)
after the matching shared orchestration is installed. This preserves the
frozen subject while independently trusting current protected orchestration.

#### Current remaining human and rollout checks

| Check                                                                          | Actual status                                                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Ruleset / branch protection and enforced merge behavior                        | **NATIVE RULES VERIFIED** on 2026-10-01; interactive review/merge cases remain unperformed; draft state is not proof      |
| Deploy and verify old-base repair                                              | **NEW CANDIDATE, NOT DEPLOYED**; PR #10 refresh verified, PR #5/#6 batch jobs failed; issue #7 remains open               |
| Obtain independent recording-scenario approval                                 | **HUMAN NOT PERFORMED** for these scenarios; both protected code owners are now installed                                 |
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
- [Automatic-refresh investigation](https://github.com/webmaxru/agentproof-demo/issues/7)

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
