# AgentProof expense API reference implementation

> A synthetic application with commit-bound evidence and explicit human
> decisions, not an agent that approves or merges its own work.

This is the **app-first** reference repository,
[`webmaxru/agentproof-demo`](https://github.com/webmaxru/agentproof-demo).
The Fastify expense-approval API, tests, package manifest, and retention
configuration are at the repository root. The reusable product kit and plugin
marketplace live separately at
[`webmaxru/AgentProof`](https://github.com/webmaxru/AgentProof).

Vendored, private AgentProof core/CLI workspaces let base-revision Actions run
without a plugin checkout or an unpublished registry package. Collectors evaluate
tests, dependency risk, and a retention declaration for one PR head SHA. A
separate trusted publisher emits `AgentProof / gate`. Optional read-only
specialists and the Evidence Assembler are started manually; their prose does
not override deterministic findings.

AgentProof produces evidence, not a legal, privacy, security, or regulatory
certification. All expense identities and data are synthetic.

**Current setup, 2026-10-01:** this repository is public. Active no-bypass
ruleset `24293848` protects `main`, requiring both `AgentProof / gate` and
`Build, lint, and test`, code-owner/independent review, last-push approval,
stale-review dismissal, and resolved conversations. Native branch/rule reads
confirm enforcement; the earlier private-plan HTTP 403 is historical.

**Installed rollout:** PR #4 and the old-base repair in PR #11 are merged.
The dated 2026-10-01 rollout anchor is
`66058035adc0ca613f4d1fa5db6afc606327b7c0`; both `@webmaxru`
and `@vibeprogrammer` are code owners. Native metadata and manual-batch paths
published evidence for the unchanged subjects, and issue #7 is closed.
The genuine 13:23 UTC scheduled run overlapped manual work; an uninterrupted
scheduler-only demonstration and the human decision/review lifecycle remain
separate recording work. Resolve the live protected default-branch SHA before
each capture; later merges advance it beyond this receipt. Cron is not a guaranteed delivery interval.
See [the dated setup record](docs/github-setup.md).

**Current demo subjects:** use frozen unsafe PR #5 and the separate
retention-only successor [PR #12](https://github.com/webmaxru/agentproof-demo/pull/12).
PR #12 starts from protected main, retains Fastify 5.12.5 and the authorization
marker, and removes only `deletionMethod`. PR #6 and its older passing
dependency receipt are historical, not current remediation proof.
[The scenario guide](demo/README.md) records the full heads and fresh-capture
requirements. A separate successor is not a same-PR stale-decision rehearsal.
All recording subjects remain draft; no exception, independent approval, or
merge availability is implied.

## Run the application

```powershell
git clone https://github.com/webmaxru/agentproof-demo.git
Set-Location agentproof-demo
npm ci --ignore-scripts
npm run check
npm run dev
```

The API binds to `127.0.0.1:3000` by default (`HOST` and `PORT` override it).
For a compiled run, use `npm run build` followed by `npm start`.

| Endpoint                            | Behavior                                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `GET /health`                       | Returns `{"status":"ok"}`.                                                                     |
| `POST /expenses`                    | Creates an expense from `submittedBy`, `description`, `amountCents`, and `currency`.           |
| `GET /expenses/:expenseId`          | Reads the synthetic expense.                                                                   |
| `POST /expenses/:expenseId/approve` | Checks the synthetic caller allow-list, prevents self-approval, and rejects repeated approval. |

Approval uses the `x-agentproof-actor-id` header with a synthetic allow-list.
This is a deterministic demo identity mechanism, **not production
authentication**. Storage is process memory; restarting resets the data.

```text
src/                      Fastify API and deterministic in-memory store
tests/                    Behavioral API tests and stable AP-ID marker
config/data-handling.yml  Synthetic retention declaration
packages/evidence-core/   Private, vendored policy/evidence engine
packages/evidence-cli/    Private, vendored collectors and evaluator
.github/                  Trusted workflows, scripts, and installed ruleset definition
policy/                   Base-revision policy and schema
demo/                     Synthetic fixture and recording scenario patches
hackathon-2026/           Recording guide, historical draft, and recording assets
```

The import is bound to upstream snapshot
`47fdeeb665d930a599a3530958b8e62325647810`; see
[migration and media provenance](docs/migration.md). Historical validation and
precomputed assets are not new live evidence.

## Roles

| Role                                 | Responsibility                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Developer or agent operator          | Opens the PR, declares known assistance, and remediates findings.                                                                           |
| Test, security, and policy reviewers | Manually start isolated, read-only sessions on the same SHA-bound facts and return advisory notes. They cannot approve exceptions or merge. |
| Release manager                      | Records an authorized, reasoned disposition for an eligible finding.                                                                        |
| Independent reviewer                 | Reviews the resulting code and approves the PR; must not be the author or release decision-maker.                                           |
| Repository administrator             | Protects workflows and policy, configures the ruleset, and scopes App/session access.                                                       |
| Field practitioner                   | Installs the kit and adapts its synthetic policy to a customer-approved use case.                                                           |

One person may fill several operational roles outside production, but the
recorded independent approval requires a distinct authorized human.

## Architecture at a glance

```text
untrusted PR head
      |
      | read-only token; no secrets
      v
deterministic collectors ----> raw evidence for head SHA
      |                               |
      +-------------------------------+
                                      v
protected-base evaluator + policy --> AgentProof / gate
                                      |
                    +-----------------+-----------------+
                    |                                   |
       manual read-only App sessions          authorized PR comment
                    |                                   |
                    +----> manual Evidence Assembler <--+
                                  |
                                  v
                             Evidence Board
                             (mutable view)

Authoritative record: GitHub commit, check, PR comments/reviews, and evidence artifact
```

The historical disposable automation permission canary is a prior observation,
not an enforcement component or a newly run reviewer. It failed closed and was
disabled; no reviewer automation is installed by this reference repository.

The write-capable publisher runs trusted default/base-branch code and does not
execute PR-controlled code. See [architecture](docs/architecture.md),
[evidence contract](docs/evidence-contract.md), and
[threat model](docs/governance-and-threat-model.md).

## Prerequisites

- Node.js 22 or later and npm.
- Git.
- A GitHub.com repository, represented below as `<OWNER>/<REPO>`, with
  GitHub Actions and enforceable repository rules. This reference is public;
  private deployments need an eligible plan.
- GitHub Copilot App/CLI access with cloud sessions, plugins, canvas
  extensions, and installed-agent or deep-link session launch for the intended
  users.
- Permission to manage repository Actions and rules, plus a distinct reviewer
  account or team such as `<RELEASE_REVIEWER_OR_TEAM>`.
- Only synthetic, non-secret demo data.

Product surfaces and plan entitlements change. Recheck the current
[GitHub Copilot App documentation](https://docs.github.com/en/copilot/how-tos/github-copilot-app)
before a customer deployment or recording.

## Install and verify

```bash
git clone https://github.com/webmaxru/agentproof-demo.git
cd agentproof-demo
npm ci --ignore-scripts
npm run check
```

Useful focused commands:

```bash
npm run build
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run agentproof -- --help
```

Do not use a production repository until the policy, permissions, data
handling, and exception model have been reviewed by the customer's accountable
owners.

## Repository setup

1. Push the safe default branch and keep Actions disabled until every workflow
   and action pin has been reviewed.
2. Confirm `.github/CODEOWNERS` names authorized humans. Both `@webmaxru`
   and `@vibeprogrammer` are installed code owners; an actual independent
   scenario review is still required, not supplied by a listed identity.
3. Review `policy/release-policy.yml`; a PR is evaluated against protected base
   policy rather than policy weakened by that same PR.
4. Enable the workflows and open a harmless PR once so the
   PR-triggered `AgentProof Analysis` and `AgentProof Publish` workflows run and
   the `AgentProof / gate` check becomes selectable.
5. Create a ruleset for `<DEFAULT_BRANCH>` that requires:
   - pull requests;
   - `AgentProof / gate`;
   - `Build, lint, and test`;
   - at least one approval from someone other than the author/release
     decision-maker;
   - stale approval dismissal;
   - code-owner review for workflows, policy, app, and evidence code;
   - resolved conversations;
   - approval of the last push by a distinct reviewer; and
   - no bypass actors.
6. Limit Actions to approved, SHA-pinned actions and retain the default
   read-only workflow token unless an individual workflow explicitly needs
   more.

This reference's ruleset is now installed and verified through native APIs.
That does not supply a scenario's independent human approval or automatically
deploy future workflow changes. Exact instructions, dated rollout receipts, and acceptance tests are in
[GitHub setup](docs/github-setup.md).

## Copilot App reviewer setup

The working MVP uses manually started reviewer sessions; it does not depend on
personal PR automations. Install the separately maintained kit from its current
marketplace:

Before using upstream `main`, confirm the reviewed marketplace points to
`webmaxru/AgentProof` and validate the installed kit revision. This repository
does not deploy that kit or claim that an older installed plugin validates the
current marketplace.

```text
copilot plugin marketplace add webmaxru/AgentProof
copilot plugin install agentproof@agentproof-marketplace
```

Earlier upstream trials used AgentProof v0.2.0; later reviewer profiles added an
explicit runtime tool-boundary stop. Those trials are not a new installation
validation. Plugin installation and every deep-link launch require the user's
authorized confirmation. This app repo intentionally does not duplicate the
plugin or register a second marketplace.

After `AgentProof Analysis` and `AgentProof Publish` produce the check, artifact,
and PR summary for the current head SHA:

1. Manually start three separate, isolated sessions with the installed Test
   Reviewer, Security Reviewer, and Policy Reviewer agents, or use their deep
   links.
2. Review and confirm each launch. Grant only repository, PR, check, and artifact
   read tools. If the UI defaults to **All tools** and cannot be safely reduced,
   cancel rather than save or launch an over-privileged configuration.
3. Confirm that every result names the full current head SHA.
4. Manually run the Evidence Assembler after all three reviewers finish; reject
   mixed-SHA inputs before loading the mutable Evidence Board.

The checked-in reviewer prompts are gated setup inputs, not active reviewer
automations:

- [Test Reviewer prompt](templates/automations/test-reviewer.md)
- [Security Reviewer prompt](templates/automations/security-reviewer.md)
- [Policy Reviewer prompt](templates/automations/policy-reviewer.md)
- [Automation Permission Canary](templates/automations/permission-canary.md)

Historical upstream validation on 2026-09-02 ran the deterministic
Analysis/Publish path in a different private repository and installed AgentProof
v0.2.0. Historical private repository identifiers are omitted rather than
reassigned to this implementation.

On 2026-09-03, a separate private automation-lab project exposed the repository
Test, Security, and Policy reviewers in the automation picker. A disposable
candidate fired for both opened and
synchronized events. The picker was manually narrowed from 50 tools to these 21
read-only operations: issue/PR reads and searches, repository file/code/ref
reads, Actions workflow/log reads, label reads, and code-scanning-alert reads.
The resulting session still reported `functions.apply_patch`, `functions.bash`,
and GitHub Actions tools with external-repository capability. It returned
`UNSAFE_TOOL_BOUNDARY`, made no PR review or inline comment, created no commit,
and was disabled. AgentProof therefore does not claim live personal reviewer
automations.

Treat [automation setup](docs/automation-setup.md) and
[enterprise settings](docs/enterprise-settings-example.md) as validated
permission-gate and product-feedback references. App deep links may prefill a
supported flow, but they never silently install a plugin, create an automation,
or start a session.

## End-to-end workflow

1. Open or synchronize a PR, which triggers the GitHub Actions analysis and
   publish path. Keep exactly one origin classification in the PR template:
   `github-attributed`, `self-declared`, or `unknown`. This is not universal
   model provenance.
2. `AgentProof Analysis` executes the untrusted subject in an ephemeral runner
   with no secrets and read-only repository/PR access. It emits normalized raw
   evidence even when a finding blocks.
3. `AgentProof Publish` validates repository, PR, workflow, schema, base SHA,
   and live head SHA; applies protected-base policy; and publishes one
   `AgentProof / gate` check plus one marker-delimited PR summary.
4. After the deterministic check completes, a user manually starts three
   visible, isolated, read-only specialist sessions with the installed agents or
   confirmed deep links. Each resolves the current head SHA, stays within its
   specialty, refuses stale/mixed evidence, and returns one advisory result.
5. The user runs the Evidence Assembler manually after all three finish. It
   rejects mixed SHAs and loads one document into the Evidence Board.
6. A human chooses remediation or, for an exceptionable finding only, records a
   bounded exception on the PR.
7. A remediation commit creates a new head SHA. Earlier dispositions, evidence,
   and stale approvals no longer satisfy the new revision.
8. The PR-triggered Actions evidence reruns. Before relying on specialist advice
   for the new revision, manually start fresh reviewer sessions and assemble
   only their same-SHA results. Record any still-needed exception against the
   new SHA.
9. A different human approves. The ruleset exposes merge only when both the
   gate and independent review are satisfied.

The canvas can be edited or cleared at any time. It coordinates review; it is
not an immutable ledger, signature, or approval. GitHub remains authoritative.

## Reproduce the synthetic risky PR

Use a disposable branch in the synthetic repository only:

```bash
git switch <DEFAULT_BRANCH>
git pull --ff-only
git switch -c demo/unsafe-change
git apply --check demo/unsafe-change.patch
git apply demo/unsafe-change.patch
npm install --package-lock-only --ignore-scripts
git add package.json tests/expenses.integration.test.ts config/data-handling.yml package-lock.json
git commit -m "Create synthetic unsafe AgentProof scenario"
git push -u origin demo/unsafe-change
```

Open a draft PR and set the origin declaration to `self-declared` with declared
tool `GitHub Copilot` only when that accurately describes the work. The prepared
recording branches use that declaration, not inferred authorship. Keep the
unsafe recording PR unchanged until the human captures its first exception.
Use the [separate current successor](demo/README.md) for prepared comparison;
do not relabel historical PR #6 or substitute another PR for the later
human-recorded same-PR transition. The patch is
intentionally unsafe: never merge it to a
real application branch. It pins a vulnerable runtime dependency, removes the
stable evidence marker from the existing non-approver behavioral test, and
removes a required retention field. Confirm the live collector produces the
expected findings; if the advisory service or dependency metadata changed, stop
and repair the demo rather than present the synthetic fixture as a scan.

## Evidence states

| State       | Meaning                                                               | Default gate effect                                               |
| ----------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `pass`      | Positive, valid evidence satisfies the checked rule.                  | Non-blocking                                                      |
| `fail`      | Evidence violates the rule.                                           | Blocking; remediate unless policy explicitly permits an exception |
| `unknown`   | Required evidence is absent, malformed, unavailable, or inconclusive. | Blocking; never silently treated as pass                          |
| `exception` | Policy requires an explicit disposition before proceeding.            | Blocking until a valid authorized acceptance exists               |

The gate fails closed for unresolved `fail`, `unknown`, or `exception`
findings. Critical or policy-marked non-exceptionable findings cannot be
accepted.

The checked-in demo policy requires a passing test suite, at least 80% lines,
functions, branches, and statements coverage, the stable non-approver
authorization test, no production dependency above `moderate`, a complete
retention declaration of at most 30 days, and a declared origin. Test and
dependency findings are non-exceptionable. The default exception policy
requires at least repository `maintain`, a 20-character rationale, and an expiry
no more than 30 days away. Always read protected-base policy rather than relying
on this summary.

## Human review and exception command

Prefer remediation. If protected-base policy marks a finding exceptionable, an
authorized release manager posts this exact command as a **PR comment**:

```text
/agentproof accept-exception <FINDING_ID>
sha: <40_CHARACTER_HEAD_SHA>
reason: <specific rationale meeting the configured minimum length>
expires: <YYYY-MM-DD>
```

The disposition workflow rejects malformed commands, issue-only comments,
unauthorized actors, stale SHAs, ineligible findings, insufficient rationale,
invalid/overlong expiry, and conflicting data. Editing, deleting, or allowing
an acceptance to expire causes revalidation and can return the gate to red.
The [exception record template](templates/exception-record.yml) is a planning
aid; the native GitHub PR comment is the authoritative submitted decision.

Exception acceptance does not replace independent code review and does not
declare compliance.

## Success measures

Measure a baseline and a trial; do not report targets as achieved results.

- Time from PR open to complete same-SHA evidence.
- Human review minutes per PR.
- Material findings found before merge.
- Percentage of `unknown`/`exception` findings explicitly dispositioned.
- Rework after first evidence review.
- Percentage of merges with a valid final-SHA evidence artifact and independent
  approval.
- Rate of stale-SHA or unauthorized disposition attempts correctly rejected.

## Governance and data boundaries

- Synthetic application, identities, policy, and findings only.
- Never place secrets, customer content, tenant URLs, or sensitive source text
  in prompts, canvas state, comments, fixtures, or screenshots.
- Reviewer agents advise; deterministic code computes the gate.
- Analysis receives no secrets and no write token. Write-capable workflows run
  trusted code and validate live GitHub state.
- Evidence is commit-bound and policy-bound, but artifact retention is finite.
- GitHub checks, commits, comments, reviews, and artifacts are authoritative;
  the Evidence Board is mutable.
- No compliance, security, provenance, authorship, or suitability claim is
  universal. Accountable humans interpret evidence in their own context.

## Limitations

- This prototype covers one GitHub repository and a small synthetic policy.
- The working MVP has no live personal reviewer automations. Its three reviewer
  sessions and Evidence Assembler are manually started after deterministic
  checks complete.
- A historical disabled private-lab permission canary recorded dispatch and an
  unsafe effective tool boundary on its stated date; it is not a current
  reviewer result or automation-as-code.
- Automation prompt templates remain blocked setup/product-feedback inputs until
  host-injected mutation tools can be removed and verified.
- Deep links and installed-agent launches require user review and confirmation.
- External tool/model origin may be self-declared or unknown.
- npm advisory availability, runner/network health, and report quality may
  produce `unknown`.
- A green gate proves only that the configured rules were satisfied for the
  identified SHA and evidence validity window.
- The canvas is mutable and cannot serve as a locked audit snapshot.
- GitHub plan, organization, ruleset, App, and preview-feature availability can
  differ.
- No automatic merge, release, legal interpretation, or exception approval is
  provided.

## Troubleshooting

- **Check is missing:** run a PR once, confirm Actions are enabled, then add the
  exact check name `AgentProof / gate` to the ruleset.
- **Gate says stale:** compare the PR's current 40-character head SHA with the
  evidence and comment; rerun and re-record the decision for the new SHA.
- **Collector is `unknown`:** inspect the workflow log and machine-readable
  report; do not convert tool/network failure into pass.
- **Reviewer is absent from the PR automation picker:** select the repository
  project first and confirm the profile exists on its default branch. If it
  remains absent, start a manual installed-agent session or confirmed deep link.
- **Automation still exposes built-in mutation tools:** disable it immediately.
  The 2026-09-03 canary still saw `functions.apply_patch` and `functions.bash`
  after every selectable mutation tool was removed. Prompt instructions are not
  a permission boundary.
- **Manual reviewer has the wrong SHA:** discard its output and start a fresh
  session only after the current deterministic check completes.
- **Plugin/canvas appears cached:** remove the development install, reinstall
  the current plugin version, and verify the built extension entry.
- **Mixed-SHA assembly:** discard old fragments and rerun every specialist
  against the live head.

## Adaptation, demo, and cleanup

- Customer policy and permission adaptation:
  [customer adaptation guide](templates/customer-adaptation-guide.md)
- Remove the manual sessions, plugin, ruleset, branches, artifacts, disabled
  permission canary, and synthetic repositories by following
  [cleanup](docs/cleanup.md).

## Provenance and license

Original additions, research inputs, generated scaffolds, dependency licenses,
and media restrictions are recorded in
[starting assets](provenance/starting-assets.md) and
[dependency licenses](provenance/dependency-licenses.md). AgentProof is
licensed under [MIT](LICENSE).
