# Copilot App reviewer sessions and automation permission canary

## Historical upstream status — 2026-09-03 (not a new live validation)

These observations predate this reference repository. Historical private
repository identifiers have been omitted, not reassigned to the new repository.
Current implementation checks are recorded in [GitHub setup](github-setup.md).

The supported AgentProof MVP is **manual use of the installed Test, Security,
and Policy Reviewer agents in separate Copilot App sessions**. AgentProof does
not claim live personal reviewer automations.

The initial 2026-09-02 trial installed AgentProof from a historical private
product-kit repository, but the automation Agent picker
offered only **Default** and **msx**. The draft was cancelled.

The 2026-09-03 recovery trial used repository profiles on the default branch of
an isolated private automation lab and added that
repository as a Copilot App project. The Agent picker then exposed all three
AgentProof reviewers. A disposable Test Reviewer candidate:

- fired on PR #1 for both opened and synchronized events;
- used cloud execution, **Require write access**, an exact head query, and a
  single synthetic path filter;
- started with 50 selected tools;
- was manually reduced to 21 read-only issue/PR, repository/ref, Actions-log,
  label, and code-scanning operations; and
- still reported `functions.apply_patch`, `functions.bash`, and GitHub Actions
  tools capable of external-repository access in the effective runtime.

The safety prompt returned `UNSAFE_TOOL_BOUNDARY` before using a tool. It added
no review or inline comment and created no commit; the only PR comment was the
trusted `github-actions` gate summary. The automation was disabled. The packaged
v0.2.1 reviewer profiles now contain the same runtime boundary stop, but prompt
instructions are defense in depth, not a permission boundary.

## Storage, confirmation, and authority boundary

A Copilot App reviewer automation, if a future experiment passes the gates below, is
**personal**, **single-repository scoped**, and **stored outside Git**. Files in
`templates/automations/` are versioned experimental inputs only; they do not
install, administer, or prove the existence of an automation.

Deep links may prefill an automation, plugin, or session flow. The current user
must review and confirm every configuration. Never describe a deep link as
silently creating, installing, or running anything.

GitHub checks, reviews, comments, artifacts, and repository rules remain the
auditable record and enforcement boundary. Reviewer output is advisory, not a
legal, security, privacy, residency, or compliance determination. Prompts,
sessions, comments, screenshots, and logs must contain no secrets or customer
data.

## Manual reviewer-session MVP

For each pull request:

1. Confirm AgentProof `v0.2.1` (or the exact reviewed replacement version) is
   installed from the approved source.
2. Start the installed AgentProof Test Reviewer, Security Reviewer, and Policy
   Reviewer manually as three independent sessions. Do not substitute
   **Default** or **msx** for a missing AgentProof reviewer.
3. Give each session only the repository and pull-request reference it needs.
   Have it resolve the live pull-request number and full head SHA from GitHub.
4. Keep each reviewer read-only. It may return a bounded review fragment, but it
   must not push, merge, approve, accept an exception, change policy, or publish
   through a mutation tool.
5. Treat absent, malformed, unavailable, mixed-SHA, or stale evidence as
   `unknown`. Preserve `pass`, `fail`, `unknown`, and `exception` as distinct
   evidence states.
6. A human may start the Evidence Assembler manually and decide whether to
   publish or act on current-SHA results. A new commit invalidates prior
   reviewer conclusions.

## Blocked reviewer automation target

The templates describe a target for a future product version:

| Target review              | Template                                     | Required custom agent        | Suggested path filter                     |
| -------------------------- | -------------------------------------------- | ---------------------------- | ----------------------------------------- |
| AgentProof Test Review     | `templates/automations/test-reviewer.md`     | AgentProof Test Reviewer     | application/tests/package test config     |
| AgentProof Security Review | `templates/automations/security-reviewer.md` | AgentProof Security Reviewer | manifests, lockfile, source, workflows    |
| AgentProof Policy Review   | `templates/automations/policy-reviewer.md`   | AgentProof Policy Reviewer   | policy, data-handling config, PR metadata |

**MUST NOT SAVE an AgentProof automation unless every item below is visibly
verified in the effective configuration:**

1. The exact installed custom AgentProof reviewer is selectable and selected;
   its source and version are identifiable. **Default** and **msx** are not
   acceptable substitutes.
2. Tool selection can begin from select-none, use an approved least-privilege
   preset, or otherwise safely clear every unnecessary tool.
3. An effective-permission preview shows only repository, pull request, diff,
   check, and same-SHA evidence reads. If publication is part of the design, a
   separate bounded update to one marker-delimited PR comment must be explicit;
   otherwise keep publication manual.
4. Push, merge, approval, branch/issue mutation, workflow dispatch, secrets,
   deployment, cross-repository access, unrelated MCP, and broad shell/network
   tools are absent from the effective scope, including implicit host built-ins.
5. Repository, `Opened`/`Synchronized` events, **Require write access**, cloud
   execution, and path filters match the reviewed plan.
6. A human reviews and confirms the personal, outside-Git configuration and
   records owner, repository, product/plugin version, events, filters, effective
   tools, prompt commit, and review date in an approved inventory.

An **All tools selected** default fails this gate. A narrowed picker also fails
when the runtime still injects mutation-capable built-ins. Disable or cancel the
candidate.

Enterprise-managed settings may constrain plugins, marketplaces, MCP, models,
permissions, and sandbox behavior, but they do not prove the effective scope of
an individual automation.

## Required behavior if the capability boundary is fixed

Each experimental prompt must:

1. resolve the live pull-request number and full head SHA;
2. read deterministic evidence tied to that SHA;
3. return `unknown` when evidence is absent, malformed, unavailable, obsolete,
   or mixed;
4. inspect only its specialty;
5. remain read-only and avoid code, policy, branch, check, disposition,
   approval, exception, and merge changes;
6. return one marker-delimited payload without invoking a mutation tool;
7. include the full head SHA, evidence links, bounded advisory findings, and a
   visible session URL; and
8. state that the result is advisory and native GitHub evidence is
   authoritative.

The target sessions do not imply native fan-out or aggregation. A human starts
the Evidence Assembler manually, and mixed-SHA input must fail closed.

## Permission-canary procedure

Use [the canary template](../templates/automations/permission-canary.md) only in
a disposable private repository with synthetic content:

1. Put the intended repository custom agent on the default branch and add the
   repository as an App project.
2. Configure one PR opened candidate with **Require write access**, cloud
   execution, an exact head query, and one synthetic path.
3. Remove every selectable mutation tool. Record the remaining names and count.
4. Make the first instruction inventory the effective runtime. If any edit,
   shell, comment, review, reaction, issue/PR mutation, commit/push, approval,
   merge, deployment, secret, or cross-repository capability exists, it must
   return `UNSAFE_TOOL_BOUNDARY` before tool use.
5. Trigger with a synthetic PR, then change to synchronized and push a new
   synthetic commit.
6. Verify the automation added no GitHub comment, review, inline comment, or
   commit and did not move the head beyond the human-created trigger commit.
7. Disable the candidate on any failure and retain only approved, non-sensitive
   validation evidence.

The 2026-09-03 trial failed at step 4 and was disabled. Do not reinterpret that
failure as a functioning reviewer automation.

## Deep-link placeholders

Only publish links generated by a current documented flow:

```text
Plugin install:       <PLUGIN_INSTALL_DEEP_LINK>
Manual test session:  <TEST_REVIEWER_SESSION_DEEP_LINK>
Manual security:      <SECURITY_REVIEWER_SESSION_DEEP_LINK>
Manual policy:        <POLICY_REVIEWER_SESSION_DEEP_LINK>
Permission canary:    <DISPOSABLE_CANARY_DRAFT_DEEP_LINK>
Sample PR:            https://github.com/<OWNER>/<REPO>/pull/<PR_NUMBER>
Assembler session:    <ASSEMBLER_SESSION_DEEP_LINK>
Remediation session:  <REMEDIATION_SESSION_DEEP_LINK>
Future automation:    <GATED_AUTOMATION_DRAFT_DEEP_LINK>
```

Label every link **review and confirm**. An automation draft link remains gated
and must be cancelled when the custom-agent or effective-tool checks fail.

## Revalidation if the product gap is resolved

Use a disposable repository and synthetic pull request:

1. Reproduce the permission canary before any reviewer automation.
2. Require both the picker and runtime inventory to exclude every mutation,
   shell, secret, deployment, and cross-repository capability.
3. Configure one candidate template at a time. Disable immediately if any gate
   is not met.
4. After a gated save, confirm only the intended events and paths start a
   session, and that the session names the current full head SHA.
5. Verify the reviewer cannot push, merge, approve, read secrets, deploy, access
   another repository, or use unrelated tools.
6. Push a new commit during review; the result must become `unknown` rather than
   publish an obsolete conclusion.
7. Remove evidence access; the result must be `unknown`, not `pass`.
8. Repeat independently for each target reviewer and manually verify
   mixed-SHA aggregation is rejected.
9. Disable and delete the experiments after recording only non-sensitive
   validation evidence.

The disabled permission canary is known to dispatch and fail closed. Do not
infer from it or the reviewer templates that any reviewer automation is live or
safe.
