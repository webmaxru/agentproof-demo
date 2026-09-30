# Product feedback from the AgentProof prototype

These proposals record workflow friction, not promises of available product
features. These are historical upstream observations, not current validation of
`webmaxru/agentproof-demo`. Historical private repository identifiers are omitted.
Reproduce against the current Copilot App before submission because the product
changes quickly.

## 1. Custom agents and effective automation permissions

- **Validation context:** on 2026-09-03, an isolated private automation lab
  contained AgentProof v0.2.0
  repository profiles on its default branch and was added as a Copilot App
  project.
- **Exact reproduction:**
  1. Open a new **Pull request** automation and select the lab project first.
  2. Confirm that AgentProof Test, Security, and Policy Reviewer now appear in
     the Agent picker.
  3. Select the Test Reviewer, `Opened`, **Require write access**, cloud
     execution, an exact head query, and one synthetic path.
  4. Observe that Tools defaults to 50 selected operations and has no
     select-none action.
  5. Manually deselect all 29 visible mutations, leaving 21 read-only
     issue/PR, repository/ref, Actions-log, label, and code-scanning operations.
  6. Open lab PR #1, then switch to `Synchronized` and push synthetic commits.
     Both event types dispatch successfully.
  7. Observe the effective run response:
     `Available tools include functions.apply_patch, functions.bash, and GitHub Actions tools that can access external repositories.`
     It then returns `UNSAFE_TOOL_BOUNDARY`.
  8. Verify the automation created no review, inline comment, or commit, then
     disable it.
- **Expected:** agent-profile and automation-tool restrictions compose into an
  enforceable effective set. If the UI shows 21 read-only tools, implicit
  `apply_patch`, shell, and broader repository access should be absent or clearly
  shown before save.
- **Impact:** the intended reviewer identity is selectable and events work, but
  the effective runtime remains mutation-capable. Prompt-only restraint is not
  an enterprise permission boundary, so the three reviewer automation templates
  cannot be represented as live.
- **Workaround:** use manual, read-only AgentProof reviewer sessions. Use a
  disposable permission canary before any automation experiment and disable the
  trigger whenever runtime capabilities exceed the reviewed scope. Keep
  publication and Evidence Assembler invocation human-controlled.
- **Product proposal:**
  - include installed plugin/custom agents in the automation Agent picker, with
    source, stable identity, and installed version;
  - add **Select none** plus administrator-reviewed presets such as
    **Read-only PR reviewer**, and show changes from the preset;
  - show a pre-save effective-permission preview that expands bundled/implicit
    built-ins, repository and write scope, MCP/network access, and denied
    capabilities, and make the preview match the runtime; and
  - expose prompt, agent/plugin version, tool scope, owner, validation date, and
    status to repository/enterprise administrators, with export, history, and
    ownership-transfer support.

The safe default should be no capabilities. A deep link may prefill a draft but
must still require human review and confirmation.

## 2. Verifiable, cross-tool assistance provenance

- **Reproduction:** submit equivalent changes from Copilot cloud activity,
  Claude-assisted local work, copied code, and human-only work; try to generate
  one trustworthy origin field.
- **Observed gap:** GitHub can attribute some first-party activity, while
  external assistance is self-declared or unknown. Code shape is not reliable
  authorship evidence.
- **Impact:** reviewers cannot consistently distinguish origin confidence from
  code/evidence quality, and manual declarations are easy to omit.
- **Workaround:** bounded `github-attributed | self-declared | unknown`
  classification that never changes the deterministic gate.
- **Proposal:** a signed, privacy-aware assistance-attestation envelope bound
  to repository and commit, supporting multiple tools and explicit `unknown`
  without inferring authorship.

## 3. First-class commit-bound release evidence and human attestation

- **Reproduction:** combine a Check Run, Actions artifact, PR comment command,
  review, policy digest, and exact SHA into one release decision.
- **Observed gap:** the proof is assembled across several GitHub objects and
  custom schemas; expiry and new-SHA invalidation require custom workflows.
- **Impact:** every field team must rebuild validation, binding, retention, and
  exception history.
- **Workaround:** versioned evidence JSON, canonical digest, strict PR command,
  stable required check, and scheduled revalidation.
- **Proposal:** a GitHub-native release-evidence object with schema/version,
  source/policy SHA, linked checks, signed human attestation, expiry,
  invalidation, ruleset integration, and export API.

## 4. Exportable or locked canvas snapshots

- **Reproduction:** load final evidence into Evidence Board, edit/clear it, then
  try to cite that exact state as the approved record.
- **Observed gap:** canvas state is intentionally mutable and is not a locked
  snapshot or signature.
- **Impact:** a useful collaboration view can be mistaken for audit evidence,
  or teams must capture screenshots that lack machine-verifiable binding.
- **Workaround:** persistent authority banner and links back to GitHub check,
  PR history, and hashed artifact.
- **Proposal:** user-confirmed immutable snapshot/export with source SHA,
  extension/version, timestamp, content digest, visibility/retention controls,
  and a link to—but not replacement for—native GitHub approval.

## 5. Native multi-agent result aggregation

- **Reproduction:** start independent manual test, security, and policy reviewer
  sessions for one PR and attempt to aggregate only their current-SHA structured
  results. Also attempt the same setup through the permission-gated PR
  automation path.
- **Observed gap:** the MVP needs manual reviewer sessions, a manual Evidence
  Assembler, and custom mixed-SHA validation. The 2026-09-03 automation flow
  selected the repository reviewers and dispatched events, but effective runtime
  tools remained mutation-capable after the picker was reduced to read-only
  operations.
- **Impact:** manual coordination adds latency and can combine obsolete results.
- **Workaround:** one marker per specialist, common schema/SHA, then a manual
  assembler that fails closed.
- **Proposal:** a governed aggregation primitive with typed child outputs,
  expected participant set, shared subject SHA, timeout/cancellation,
  partial/unknown semantics, provenance links, and human-confirmed publication.

## 6. Versioned, administrator-visible automations

- **Reproduction:** inspect the saved private-lab permission canary, then ask a
  repository administrator to review its prompt, custom-agent version, 21
  selected tools, implicit runtime built-ins, history, or ownership from Git.
- **Observed gap:** the automation is personal and stored outside Git; committed
  prompts are only setup inputs. The picker and runtime capability sets differ,
  and administrators lack a repository-native versioned effective-permission
  record.
- **Impact:** drift, ownership, review, recovery, and fleet inventory are
  harder in governed environments.
- **Workaround:** keep manual reviewer sessions as the MVP. Commit prompt/canary
  templates, disable failed experiments, and maintain an inventory of owner,
  repository, events, agent/plugin version, selected and runtime tool scopes,
  prompt commit, validation result, and review date.
- **Proposal:** optional automation-as-code with review/approval, version
  history, effective-permission preview, administrator inventory, ownership
  transfer, policy constraints, and safe deep-link import that still requires
  confirmation.

## Feedback evidence to capture

For each end-to-end trial record product version/date, exact steps, expected and
actual behavior, non-sensitive screenshot or log, time/workaround cost, and
whether the proposal still applies. Do not submit customer identifiers,
secrets, private evidence, or a claim that the gap is universal. Do not describe
reviewer or scanner output as a legal or compliance determination.
