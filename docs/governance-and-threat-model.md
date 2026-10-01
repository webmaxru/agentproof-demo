# Governance and threat model

## Protected assets

- Integrity of `AgentProof / gate`.
- Binding among repository, PR, base policy, head SHA, findings, dispositions,
  and artifact digest.
- Human identity and independent approval.
- Workflow tokens, repository settings, and absence of secrets in untrusted
  execution.
- Confidentiality of customer and enterprise data.

## Trust boundaries

| Zone                                                             | Trust level          | Rule                                                                                                                                                    |
| ---------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR code, package scripts, PR body, comments, and model prose     | Untrusted input      | Parse narrowly; execute only in a no-secret, read-only analysis job.                                                                                    |
| Protected base workflows, scripts, evaluator, schema, and policy | Trusted enforcement  | CODEOWNERS and ruleset protect changes; publisher runs only this revision.                                                                              |
| App reviewer sessions                                            | Advisory             | User-confirmed manual sessions are read-only and return advisory fragments. They cannot comment, approve, push, merge, or mutate policy.                |
| Personal PR automation experiment                                | Untrusted capability | A disposable permission canary must inspect effective host tools before use. Any mutation-capable built-in stops the run; a human disables the trigger. |
| Evidence Board                                                   | Mutable coordination | Never accepted as an approval, signature, or immutable audit record.                                                                                    |
| Native GitHub commit/check/comment/review/artifact               | Authoritative record | Validate current state and SHA; retain/export according to approved policy.                                                                             |

## Threats, controls, and residual risk

| Threat                                                          | Primary controls                                                                                                             | Residual risk / response                                                                                                                                                |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR code steals secrets or writes to the repository              | No secrets, read-only token, ephemeral runner, `persist-credentials: false`, no write capability in analysis                 | PR code still executes and may attack the runner/network or produce hostile logs. Use only synthetic data; add network isolation/egress controls for production.        |
| PR changes evaluator/workflow/policy to approve itself          | Publisher checks out protected base/default code and applies base policy; CODEOWNERS and ruleset protect paths               | A compromised admin/default branch remains trusted. Protect administrator accounts and audit bypass.                                                                    |
| Forged, replayed, or wrong artifact                             | Validate source workflow/repository/run, schema, PR, base/head SHA, artifact names/digests, and live head                    | GitHub/service compromise is outside the prototype; fail closed on any ambiguity.                                                                                       |
| Old run overwrites a new result                                 | Per-PR concurrency, live-head resolution before publish, SHA-bound check/artifact                                            | Race defects are possible; acceptance tests must force overlapping updates.                                                                                             |
| Unauthorized or vague exception                                 | Exact PR-comment grammar, repository-permission check, eligibility, rationale/expiry bounds, comment digest, current SHA     | Authorized users can still make poor decisions; require independent approval and periodic review.                                                                       |
| Accepted exception is edited, deleted, expires, or head changes | Comment event revalidation, scheduled/manual revalidation, stale-SHA rejection                                               | Schedule delay creates a bounded validity window; set it to organizational risk tolerance.                                                                              |
| Reviewer agent invents a pass or mixes SHAs                     | Deterministic gate is authoritative; prompts require same-SHA evidence and `unknown` on gaps; assembler rejects mixed inputs | Prose may still be wrong. Humans follow evidence links and GitHub check, not the summary alone.                                                                         |
| Canvas is mistaken for audit evidence                           | Persistent banner and documentation: mutable operational view only                                                           | Screenshots can mislead; label fallback media and show GitHub authoritative records.                                                                                    |
| Claimed model provenance is false                               | Only `github-attributed`, `self-declared`, or `unknown`; provenance does not affect verified gate facts                      | Universal authorship detection is unsolved and explicitly not claimed.                                                                                                  |
| Dependency service/report is unavailable                        | Collector emits `unknown`; gate fails closed                                                                                 | Availability can block merge. Establish an authorized, bounded outage process rather than silently passing.                                                             |
| Sensitive data leaks through prompt/comment/artifact/log        | Synthetic demo, bounded fields, no secrets, minimum logging, prompt review                                                   | Production adoption needs data classification, retention, regional, and incident controls outside this kit.                                                             |
| Author or release decision-maker self-approves                  | Ruleset requires distinct human approval and dismisses stale reviews                                                         | Small teams need a documented independent-review rota or cannot use this control as designed.                                                                           |
| Automation picker hides effective built-in capabilities         | Disposable canary, explicit tool inventory, no mutation calls, disable-on-failure                                            | On 2026-09-03 the runtime still exposed `functions.apply_patch` and `functions.bash` after selectable mutation tools were removed. Reviewer automations remain blocked. |

Manual App launch is also a trust decision. Start reviewers only after the
deterministic check exists, inspect every installed-agent or deep-link
confirmation, and allow only the required read tools. If the UI defaults to
**All tools**, reduce it explicitly and still inspect the runtime inventory.
The private-lab canary proved that picker state is insufficient because
`functions.apply_patch` and `functions.bash` remained available. Disable any
such automation. The checked-in reviewer prompts are blocked
setup/product-feedback templates, not evidence of deployed controls.

## Least privilege

- **Analysis:** `contents: read` and PR metadata read only; no secrets.
- **Publisher:** artifact/content read plus only the check/PR-summary write scopes
  required to publish validated results; it never runs PR code.
- **Disposition/revalidation:** read current PR/comment state and dispatch trusted
  analysis; the candidate repair also dispatches Publisher after exact-run
  validation using the same existing actions-write scope. It never waits for
  Publisher while holding its gate lock or approves exceptions itself.
- **Manual App reviewers:** repository, PR, check, and artifact read only.
  Disable comments, push, merge, issue mutation, secrets, cross-repository, and
  unrelated MCP access. Run the Evidence Assembler manually after all three
  same-SHA fragments exist.
- **Permission canary:** use only in a disposable synthetic repository. It calls
  no tool when any mutation capability is present and is disabled after the
  validation.

Review the actual workflow `permissions` blocks and App tool selections; prose
cannot grant or constrain access.

## Human accountability

An exception acceptance is a native GitHub PR comment authored by an authorized
release manager, bound to a finding and exact SHA, with a reason and expiry.
It does not equal PR approval. A different reviewer evaluates the code and the
repository ruleset requires both independent approval and a green gate.

On 2026-10-01 this public reference's no-bypass ruleset and effective main
branch rules were verified. No distinct human code owner has been onboarded.
All scenario PRs remain draft, so draft-disabled Merge is not a review or
required-check test. The candidate refresh repair is unmerged; automatic
comment/scheduled publication remains unverified until protected-base rollout
and a genuine native end-to-end run. Issue #7 stays open in the meantime.

Emergency bypass, if the organization permits one, must be a separately
authorized break-glass process with reason, time, actor, incident/reference,
and retrospective review. It is not part of the demo.

## Claims boundary

AgentProof reports whether configured evidence and disposition rules passed for
one revision. Scanners and agents do not make legal or compliance
determinations. No provenance, compliance, security, privacy, or suitability
claim is universal.
