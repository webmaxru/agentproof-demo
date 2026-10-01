# Microsoft Global Hackathon 2026 — three-slide competition outline

**Primary executive challenge:** [Hack to Make Agents
Trustworthy](https://innovation-studio.microsoft.com/events/hackathon2026/challenges/executive-challenges)

**Submission thesis:** AgentProof supplies commit-bound evidence and explicit
human decisions. Public main has verified active no-bypass protections and both
code owners. PR #10 automatic refresh is verified, but the batch failed for
old-base PR #5/#6; the follow-up repair's human rollout remains pending.
A draft-disabled Merge button is not a check/review
test. Keep historical slides labeled illustrative and use current native
records for enforcement claims.

**Judge promise:** Show a real red-to-green release decision, not a research
demo: same-SHA evidence, explicit human disposition, new-SHA invalidation,
fresh evidence, and independent approval.

Use 16:9, large text, captions, and only redacted synthetic screenshots. Replace
all placeholders before recording.

## Slide 1 — Trust breaks between AI output and release

**Headline:** Agents can build; accountable humans still decide what ships.

**Visual:** Left: self-declared GitHub Copilot-assisted synthetic PR. Center: three
unresolved cards (`dependency fail`, `authorization marker fail`, `retention
unknown`). Right: release manager.

**Evidence strip:** Anonymized research found two direct release-validation
cases, with adjacent AI-governance evidence across nine accounts and traceable
legal/compliance evidence across five. Counts validate the problem, not demand
for this exact solution; no customer names, quotes, or links.

**Speaker line:** “The hard problem is not who typed the code. It is whether the
exact change earned evidence and an accountable decision.”

## Slide 2 — AgentProof's commit-bound control loop

**Headline:** Deterministic evidence, specialist context, explicit decision.

**Visual:** One horizontal flow:

```text
PR head SHA → no-secret collectors → protected-base policy → AgentProof / gate
          ↘ confirmed manual Test / Security / Policy sessions
           → manual Evidence Assembler → mutable Evidence Board
          → human remediation or bounded exception → new SHA invalidation
          → independent PR approval → merge
```

Add two live screenshots: red check with full SHA and final green check/review.
Caption: “GitHub is authoritative; the canvas is a mutable coordination view.”

**Historical badge:** “2026-09-02 upstream trial: PR-triggered Analysis/Publish
produced SHA-bound evidence and the plugin/board were exercised in a different
private repository. This is not a new live validation.”

**Speaker line:** “Manually launched read-only agents explain same-SHA facts,
deterministic code computes the gate, and a different human approves.”

## Slide 3 — Reusable, governed, and honestly bounded

**Headline:** A field kit customers can adapt without copying customer data.

**Visual:** Plugin box (four agents, two skills, Evidence Board), three blocked
reviewer-automation prompt cards, one **PERMISSION CANARY — DISABLED** card,
protected-policy/customer-adaptation template, and metrics row.

**Competitive callout:** “Claude Code and Copilot both edit code and use MCP.
Here, the working prototype demonstrates a GitHub-centered handoff across
manually started isolated sessions, reusable UI, remediation, checks, reviews,
and GitHub rules—not superior code generation.”

**Limit/product-feedback callout:** The working MVP has manual reviewers and a
manual assembler. On 2026-09-03, repository agents appeared after project
selection and PR opened/synchronized events fired. Even after reducing 50 tools
to 21 read-only operations, the runtime exposed `apply_patch`, `bash`, and
broader Actions access. The canary returned `UNSAFE_TOOL_BOUNDARY`, made no
mutation, and was disabled. Deep links require confirmation; canvas is mutable;
external provenance may be self-declared/unknown. Proposals: enforceable
least-privilege presets and previews, signed assistance attestation, native
commit-bound release evidence, locked/exportable canvas snapshots, typed
multi-agent aggregation, and versioned/admin-visible automations.

**Speaker line:** “The green result is bounded to this repository, policy, and
SHA; it is evidence, not universal compliance or provenance.”

## Submission quality bar

- Show measured baseline-versus-trial outcomes for review time, findings found
  before merge, explicit disposition rate, and stale-SHA rejection.
- Keep the disabled permission canary visible as evidence that AgentProof stops
  when the host exposes unsafe mutation capability.
- Name GitHub checks, comments, reviews, artifacts, and commits as the
  authoritative record; label the Evidence Board as mutable coordination state.
- Do not claim universal provenance, compliance, security, automatic approval,
  or live reviewer automations.
