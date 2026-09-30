# Customer adaptation guide

Do not copy the synthetic policy into production unchanged. AgentProof is a
workflow pattern; accountable customer owners must define the rules, data
boundary, permissions, retention, and evidence that are appropriate to one
repository class.

## 1. Define the bounded use case

| Decision                                 | Customer-approved value |
| ---------------------------------------- | ----------------------- |
| Repository class and owners              | `<VALUE>`               |
| Change/release boundary                  | `<VALUE>`               |
| Data classification and prohibited data  | `<VALUE>`               |
| Regulatory/legal interpretation owner    | `<PERSON_OR_TEAM>`      |
| Release manager(s)                       | `<PERSON_OR_TEAM>`      |
| Independent reviewer(s)                  | `<PERSON_OR_TEAM>`      |
| Manual reviewer-session owner and backup | `<PERSON_OR_TEAM>`      |
| Future automation owner and backup       | `<PERSON_OR_TEAM>`      |
| Evidence/log/artifact retention          | `<VALUE>`               |
| Recovery and break-glass process         | `<REFERENCE>`           |

Exclude customer data from the first trial. If later evidence contains source,
logs, vulnerability details, or personal data, complete the customer's data
classification, residency, access, retention, deletion, and incident reviews
before enabling it.

## 2. Adapt protected policy

For every rule record:

| Field                      | Question                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Stable ID                  | Will the same rule retain identity across commits and versions?                     |
| Positive evidence          | What exact machine-readable result earns `pass`?                                    |
| `fail` condition           | What observed fact violates the rule?                                               |
| `unknown` condition        | Which missing/tool/network/schema states must block?                                |
| Severity                   | Who approved the mapping and review cadence?                                        |
| Exceptionable              | Can a human ever accept it? Critical controls should normally be non-exceptionable. |
| Authorized actor           | Which repository permission/team is required?                                       |
| Rationale                  | Minimum useful content without exposing sensitive data?                             |
| Maximum expiry             | How long may risk remain before fresh review?                                       |
| Remediation/evidence owner | Who acts and who verifies?                                                          |

Keep policy on the protected base branch, validate it against schema, record its
digest, and prevent a PR from evaluating itself against a weakened policy.
Passing means only that these configured rules passed for the identified SHA.

## 3. Replace synthetic collectors deliberately

- Use machine-readable reports with tool/version/time/source identifiers.
- Preserve exit codes and advisory/rule IDs.
- Turn absence, parse failure, stale data, and service failure into `unknown`.
- Bound retained source excerpts; prefer references/digests over full content.
- Test clean, failing, unavailable, malformed, and tampered cases.
- Do not equate a scanner result with legal, privacy, security, residency, or
  compliance certification.

## 4. Set least privilege

The current MVP uses manually started installed AgentProof reviewer sessions.
Verify the plugin source/version and exact reviewer identity, and maintain the
split:

- untrusted PR execution: no secrets and read-only;
- trusted publisher: only required check/comment writes and no PR execution;
- manual specialist reviewers: repository/PR/check/evidence read only, scoped
  to one current full head SHA;
- no agent push, merge, approval, exception acceptance, secret access,
  deployment, or cross-repository access.

A human controls publication and starts the Evidence Assembler. Preserve
`pass`, `fail`, `unknown`, and `exception` as distinct evidence states.

The files in `templates/automations/` are gated experimental inputs, not live
reviewer configuration. **Do not enable a reviewer automation** unless:

1. the exact installed AgentProof custom reviewer is available in the Agent
   picker, with its approved source and version visible;
2. tools can start from select-none or an approved preset;
3. both the picker and a disposable runtime canary prove the exact
   least-privilege read scope and any separate bounded publication behavior; and
4. push, merge, approval, exception, secrets, deployment, cross-repository,
   unrelated MCP, implicit edit/apply-patch, and broad shell/network capabilities
   are absent.

On 2026-09-03, repository reviewers became selectable after adding the private
lab as an App project, and opened/synchronized events ran. The gate still failed:
after reducing 50 picker tools to 21 read-only operations, the runtime exposed
`functions.apply_patch`, `functions.bash`, and broader Actions access. The
candidate made no automation mutation and was disabled.

If a future product version passes the gate, the automation remains personal
and stored outside Git. Enterprise-managed settings, picker selections, and
effective runtime tools are separate. Require human review/confirmation,
version/admin visibility, ownership transfer, inventory, and periodic
revalidation.

## 5. Design human decisions

Prefer remediation. For any exceptionable rule, define authorized actors,
minimum rationale, maximum duration, evidence visibility, conflicting-decision
handling, and periodic revalidation. Bind every decision to finding ID and full
head SHA. A different person must independently approve the PR.

Canvas controls may draft a command but cannot silently accept or become the
authoritative approval. GitHub remains the system of record.

## 6. Pilot and measure

Run on disposable/synthetic PRs first:

- manually start each installed custom reviewer; do not substitute a default
  agent for a missing AgentProof agent;
- red gate and missing independent review block separately;
- unauthorized, malformed, stale, overlong, edited, deleted, and expired
  decisions remain blocking;
- a new commit invalidates decisions and approvals;
- tool outage becomes `unknown`;
- mixed/tampered evidence is rejected; and
- no sensitive content reaches prompts, comments, artifacts, or screenshots.

Capture baseline and trial values for evidence latency, human review time,
pre-merge findings, explicitly dispositioned unknowns, rework, complete
final-SHA evidence, and rejected stale/unauthorized decisions. Do not call a
target an achieved outcome.

## 7. Production readiness decision

Obtain named approval from repository/platform, security, privacy/legal/data,
and release owners as applicable. Record remaining risks, support ownership,
retention/deletion, monitoring, product-version dependencies, rollback, and
training. Reviewer and scanner output is not a legal or compliance
determination, and no adaptation makes AgentProof's provenance claims
universal.
