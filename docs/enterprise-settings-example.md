# Enterprise settings example

This is a **non-universal example**, not an exported policy, guaranteed product
schema, or compliance baseline. Names and availability vary by GitHub plan and
the current Copilot App. An enterprise administrator must translate the intent
into approved live settings.

As validated through 2026-09-03, the AgentProof MVP uses manually started
installed reviewer sessions. A disposable private-lab automation proved that
repository reviewers appear after project selection and that PR
opened/synchronized events dispatch. It also failed the permission gate: after
the picker was reduced from 50 tools to 21 read-only operations, the runtime
still exposed `functions.apply_patch`, `functions.bash`, and broader Actions
access. The candidate was disabled.

## Layer 1: centrally managed App guardrails

| Area                 | Example intent                                                                                                         | Verification evidence                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Plugins/marketplaces | Allow the reviewed AgentProof source/version only; block unapproved marketplaces.                                      | Admin settings screenshot/export plus installed plugin version. |
| MCP                  | Deny by default; allow only approved servers with reviewed data boundaries. AgentProof MVP needs no customer-data MCP. | Effective MCP allowlist and user test.                          |
| Models/BYOK          | Use organization-approved defaults/providers; do not treat model selection as evidence provenance.                     | Effective model policy, without keys.                           |
| Permissions          | Require confirmation for privileged operations and preserve least privilege.                                           | Effective App permission behavior.                              |
| Sandbox/network      | Prefer isolated cloud execution and approved egress; keep untrusted PR analysis secret-free.                           | Test session and network policy.                                |
| Data/retention       | Apply approved session/log retention and regional handling for the intended data class.                                | Enterprise policy reference.                                    |
| Plugin distribution  | Publish through an approved internal path and document owner/support/version.                                          | Marketplace entry or controlled install record.                 |

Do not put tokens, tenant URLs, provider keys, customer identifiers, or private
policy values in this repository or screenshots.

## Layer 2: manual reviewer-session MVP

For each AgentProof Test, Security, or Policy Reviewer session:

- verify the installed plugin source and version;
- start the exact installed custom reviewer manually, never **Default** or
  **msx** as a substitute;
- scope the request to one repository, pull request, and current full head SHA;
- keep the reviewer read-only, with no push, merge, approval, exception,
  secrets, deployment, or cross-repository capability;
- turn absent, malformed, unavailable, stale, or mixed evidence into `unknown`;
  and
- retain only approved, non-sensitive session/evidence references.

A human controls publication, Evidence Assembler invocation, remediation,
exception decisions, approval, merge, and release.

## Layer 3: blocked personal automation experiment

Central settings do not automatically prove least privilege for an automation.
Automations are personal and stored outside Git. The committed templates do not
create them.

**Do not enable a reviewer automation** unless the exact AgentProof custom
agent, source/version, and explicit effective least-privilege tool scope are all
visible and verified in both the picker and runtime. An all-tools default or
implicit host `apply_patch`/shell capability fails this gate.

If a future product version passes the gate, record this candidate
configuration separately for each reviewer:

```yaml
status: gated_experiment
owner: <AUTOMATION_OWNER>
repository: <OWNER>/<REPO>
events: [pull_request_opened, pull_request_synchronized]
require_write_access: true
execution: cloud
agent:
  name: <EXACT_AGENTPROOF_REVIEWER>
  plugin_source: <APPROVED_SOURCE>
  plugin_version: <REVIEWED_VERSION>
tool_selection:
  initial_state: select_none_or_approved_preset
allowed_reads:
  - repository contents
  - pull request metadata and diff
  - checks and same-SHA evidence artifacts
allowed_writes:
  - <NONE_OR_VERIFIED_SEPARATE_BOUNDED_COMMENT_UPDATE>
denied:
  - implicit host edit, apply-patch, or shell tools
  - push or branch mutation
  - merge or approval
  - issue mutation
  - secret access
  - deployment
  - cross-repository access
  - unrelated MCP and broad shell/network tools
prompt_source: templates/automations/<REVIEWER>.md@<COMMIT_SHA>
effective_permission_preview_verified: true
custom_agent_picker_verified: true
reviewed_at: <YYYY-MM-DD>
reviewer: <ADMIN_OR_SECURITY_REVIEWER>
```

This YAML is an inventory example only. It neither creates an automation nor
proves that the listed controls are available. Any deep link must open a draft
for explicit human review and confirmation.

## Separation-of-duty example

- Developer/agent operator opens and remediates the PR.
- Reviewer-session owner starts read-only specialist sessions manually.
- A future automation owner may operate only an experiment that passed the save
  gate.
- Release manager may accept a policy-eligible bounded exception.
- A different code owner/reviewer approves the PR.
- Repository administrator manages rules and emergency bypass.

If the organization cannot keep the author/session or automation owner separate
from the independent reviewer, it must redesign the control rather than claim
independence.

## Validation before rollout

1. Confirm the effective enterprise settings using a non-production account.
2. Install the exact reviewed plugin version through a confirmed flow.
3. Exercise the three installed reviewers as manual, read-only sessions against
   synthetic pull requests and current full head SHAs.
4. Run the disposable permission canary before any reviewer automation. Verify
   custom-agent selection, picker scope, and the actual runtime inventory.
5. Disable the experiment if it exposes edit, shell, push, merge, approval,
   secret, deployment, or cross-repository capability; then remove it when the
   trial ends.
6. Prove the ruleset blocks red-gate and missing-review cases independently.
7. Review data classification, retention, incident response, accessibility,
   legal, and regional requirements with accountable owners.
8. Revalidate after product, model, plugin, prompt, permission, or owner change.

Passing this example does not establish universal security or compliance.
