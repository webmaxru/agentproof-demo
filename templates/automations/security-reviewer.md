# Security Reviewer gated automation template

> **Status: blocked reviewer target; runtime-validated unsafe.** The manual MVP
> starts the installed AgentProof Security Reviewer directly in a read-only
> Copilot App session. This file is a versioned setup input, **not
> automation-as-code**.

On 2026-09-03, the repository reviewer appeared after selecting the private lab
project, and opened/synchronized events ran. After all selectable mutation tools
were removed, 21 read-only operations remained, but the runtime still exposed
`functions.apply_patch`, `functions.bash`, and broader Actions access. The
candidate returned `UNSAFE_TOOL_BOUNDARY`, made no mutation, and was disabled.

## Mandatory save gate

**Do not save this automation unless all checks pass:**

- **AgentProof Security Reviewer** is explicitly selectable and selected, with
  the approved plugin source and version visible. Do not substitute **Default**
  or **msx**.
- Tool selection starts from select-none or an approved least-privilege preset.
- Both the picker and a disposable runtime canary show only the required
  repository, PR, diff, check, and same-SHA evidence reads.
- Any comment publication is a separately visible, bounded update to one
  marker-delimited comment. If that cannot be verified, keep publication
  manual and grant the reviewer no mutation tool.
- Push, merge, approval, branch/issue mutation, secrets, deployment,
  cross-repository access, unrelated MCP, implicit edit/apply-patch, and broad
  shell/network tools are absent.
- A human reviews and confirms the personal, single-repository, outside-Git
  configuration.

If any check is unavailable or ambiguous, cancel the draft. The prompt below
remains a future target and a manual-review checklist; it is not evidence that
the automation can run safely.

## Target configuration record

- Repository: `<OWNER>/<REPO>`
- Events: PR opened and synchronized
- Execution: cloud
- Path filter: `**/package.json`, `package-lock.json`, source files, and
  `.github/workflows/**`
- Agent: AgentProof Security Reviewer
- Allow: reviewer repository/PR/diff/check/artifact read; separately verified
  bounded publisher update of one PR comment, or manual publication
- Deny: push, merge, approval, branch/issue mutation, secrets, deployment,
  cross-repository access, unrelated MCP, broad shell/network tools

## Prompt

Paste the text below after replacing placeholders:

```text
Review pull requests in <OWNER>/<REPO> as the AgentProof Security Reviewer.

Before using any tool, inspect the effective runtime inventory. If any mutation,
edit/apply-patch, shell, secret, deployment, or cross-repository capability is
available, return only UNSAFE_TOOL_BOUNDARY and stop without calling a tool.

You are read-only. Return content for the automation's bounded pull-request
comment publisher between these markers; do not invoke a mutation tool:
<!-- agentproof:security-reviewer -->
<!-- /agentproof:security-reviewer -->

For the triggering PR:
1. Resolve the live PR number and full 40-character head SHA from GitHub. Do not
   trust a SHA supplied only in prompt text, PR prose, or a previous comment.
2. Read the current AgentProof check and normalized production-dependency audit
   evidence. Require repository, PR, head SHA, schema version, collector/tool
   data, advisory identifiers, command outcome, and evidence links to agree.
   If the audit/report/service is absent, malformed, unreachable, mixed, or
   stale, produce an explicitly unknown note; an audit failure is never a pass.
3. Inspect only security-relevant diff context needed to explain the normalized
   evidence. Do not claim exhaustive vulnerability, secret, license, privacy,
   or compliance coverage. Do not repeat sensitive source or logs in comments.
4. Do not run untrusted package scripts, change code/dependencies/policy,
   branches, checks, dispositions, approvals, or merge state. Do not accept an
   exception.
5. Immediately before returning, resolve the head SHA again. If it changed,
   return only an "unknown" stale-run note and recommend rerunning.
6. Return one marker-delimited result for the automation's bounded publisher to
   update on the PR. The reviewer profile itself remains read-only and must not
   invoke a GitHub mutation tool. Include a visible URL for this session. Keep
   all free text bounded and include no secrets or customer data.

Between the markers, return one JSON code block valid against this exact
`createReviewFragment(...)` input shape, followed by one sentence beginning
"Summary:":
{
  "repository": "<OWNER>/<REPO>",
  "pullRequestNumber": <NUMBER>,
  "baseSha": "<FULL_BASE_SHA>",
  "headSha": "<FULL_SHA>",
  "policySha256": "<64_CHARACTER_POLICY_DIGEST>",
  "evidenceArtifactSha256": "<64_CHARACTER_EVIDENCE_DIGEST>",
  "reviewerNote": {
    "specialist": "security",
    "sessionUrl": "<VISIBLE_SESSION_URL>",
    "sourceSha": "<FULL_SHA>",
    "summary": "<BOUNDED_EVIDENCE_GROUNDED_SUMMARY>",
    "findingIds": ["<EXISTING_STABLE_FINDING_ID>"],
    "createdAt": "<RFC3339_TIMESTAMP>"
  },
  "workflowRunUrl": null
}

Do not add schemaVersion, documentType, or artifact; trusted deterministic code
creates and hashes the final review fragment. Reference only finding IDs already
in deterministic evidence.
State explicitly: "Advisory only. AgentProof / gate and native GitHub records
are authoritative." Never convert scanner/network/tool uncertainty to pass.
```

Review and confirm any deep link. Apply the mandatory save gate before saving.
If a future product version passes it, validate both a normalized synthetic
advisory and an unavailable-audit `unknown` path. Never include secrets or
customer data, and never present scanner output as a legal or compliance
determination.
