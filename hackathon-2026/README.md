# AgentProof submission packet

This folder contains competition-specific material only. The product
documentation remains in the repository root and `docs/`; this packet is
deliberately isolated so the public project README can describe AgentProof
without event-specific positioning or deadlines.

This migrated packet is in the **public** app-first reference repository
`webmaxru/agentproof-demo`. Its original event framing and historical trials
are not new live evidence. Consult [actual GitHub setup](../docs/github-setup.md)
before using copy-ready claims: public main now has a verified active no-bypass
ruleset, but independent code-owner onboarding, protected-base repair rollout,
human exceptions/review, and final privacy sign-off remain prerequisites.
Automatic refresh is still an unmerged candidate. All scenario PRs are draft;
neither a red/green check nor draft-disabled Merge alone proves the review flow.

## Contents

| Path                         | Purpose                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `winning-criteria-matrix.md` | Judge-facing mapping from winning criteria to current product evidence, demo proof, and remaining actions.               |
| `video-recording-guide.md`   | Production plan, privacy controls, capture setup, live-demo procedure, fallback protocol, and post-production checklist. |
| `video-script.md`            | A time-coded, voiceover-ready script for a 2:54 final cut.                                                               |
| `recording-checklist.md`     | Printable go/no-go checklist for the presenter and editor.                                                               |
| `demo/storyboard.md`         | Original shot storyboard and timing budget.                                                                              |
| `demo/runbook.md`            | Live validation and presenter runbook.                                                                                   |
| `fallback/README.md`         | Rules for continuity footage and clearly labeled precomputed material.                                                   |
| `slides/outline.md`          | Three-slide pitch outline and submission quality bar.                                                                    |
| `assets/`                    | Generated title cards, captions, and draft media.                                                                        |
| `assets/recording-kit/`      | Editable slides, reviewed exports, overlays, draft captions, timing reference, and read-only current-state helper.       |

## Recommended submission framing

This section is the copy-ready submission profile. It follows the current
Innovation Studio project readiness model: title, tagline, description,
keywords, one linked executive challenge, and a required demo video.

**Official references:** [Hackathon About
page](https://innovation-studio.microsoft.com/events/hackathon2026/page/about)
and [Executive
Challenges](https://innovation-studio.microsoft.com/events/hackathon2026/challenges/executive-challenges).

### Submission type and challenge

| Field               | Final value                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| Submission type     | **Project**                                                                                          |
| Executive challenge | **Hack to Make Agents Trustworthy**                                                                  |
| Challenge selection | Link exactly one executive challenge. Do not dilute the fit by linking several unrelated challenges. |
| Project maturity    | Working prototype with a live end-to-end demonstration                                               |
| Data used in demo   | Synthetic expense-approval data only                                                                 |

### Title

**AgentProof: Trustworthy Agentic Delivery**

### Tagline

**Commit-bound evidence and accountable human decisions for AI-assisted software delivery.**

### Description

AI-assisted development can increase throughput while making release decisions
harder to defend. Reviewers see code, tests, and agent output, but may not know
whether the exact commit was evaluated under the intended policy, whether an
exception was authorized, or whether an old approval survived a new commit.

AgentProof is a model-neutral control loop for trustworthy agentic delivery.
When a pull request opens, a no-secret GitHub Actions analysis runs
deterministic test, dependency, retention, and origin collectors against the
pull-request head. A protected-base evaluator applies the policy from the
trusted base revision. The publisher validates the repository, pull request,
workflow, policy, artifact, and live head SHA before publishing the
`AgentProof / gate`, an evidence artifact, and a pull-request summary.
Unresolved `fail`, `unknown`, and `exception` states block.

After the check, isolated read-only specialist sessions explain the same-SHA
evidence; they cannot approve, merge, or mutate the repository. A release
manager may record only an eligible, reasoned, expiring exception. When code
changes, the new SHA invalidates the old evidence, decision, and approval. A
distinct human reviewer must still approve before merge.

The result is not a chatbot and not a claim of universal compliance or
authorship. It is a practical, GitHub-native safety boundary that lets
organizations adopt AI-assisted engineering without removing human
accountability. The demo uses synthetic data and shows a red-to-green path:
unsafe pull request, evidence, bounded decision, remediation, stale-SHA
rejection, fresh evidence, independent approval, and a disabled automation
canary when unsafe mutation tools remain visible.

### Keywords

`trustworthy AI, AI agents, agentic engineering, GitHub Copilot, GitHub Actions, software supply chain, release governance, SHA-bound evidence, human-in-the-loop, responsible AI, developer productivity, policy-as-code`

### Challenge fit

AgentProof directly addresses **Hack to Make Agents Trustworthy**. The
trustworthiness problem is operational: an organization needs to know whether
the exact AI-assisted change being released was evaluated, whether the
evidence is current, whether a human decision is authorized and bounded, and
whether an approval survived subsequent changes. AgentProof makes those
questions visible and enforceable without pretending to determine authorship or
make a legal or compliance decision.

The strongest challenge proof is the new-SHA transition. A remediation commit
does not inherit the old evidence, exception, or approval. The release must
earn a fresh decision, and an independent human remains accountable.

### Audience and user value

**Primary users:** engineering teams, release managers, repository
administrators, security and policy reviewers, and organizations adopting
AI-assisted development.

**User pain:** manual review is slow, evidence is scattered, old approvals can
be mistaken for current approval, and agent automation can expose more
capability than its configuration suggests.

**User outcome:** a release manager gets one current, commit-bound decision
surface; reviewers get bounded evidence; repository owners get a fail-closed
control that works with existing GitHub rules.

### Innovation and differentiation

- **Commit-bound, not prose-bound:** every finding, disposition, reviewer note,
  artifact, and gate is tied to the full pull-request head SHA.
- **Protected-base evaluation:** a pull request cannot weaken the policy used to
  evaluate itself.
- **Distinct evidence states:** `pass`, `fail`, `unknown`, and `exception` are
  preserved instead of hiding uncertainty behind a green result.
- **Human accountability without human busywork:** specialist agents explain
  evidence, but they cannot approve, merge, or override the deterministic gate.
- **Fail-closed host boundary:** the permission canary stops when hidden
  mutation capability remains visible, rather than presenting an unsafe
  automation as a success.
- **Honest scope:** GitHub records remain authoritative and the Evidence Board
  is explicitly mutable coordination state.

### Microsoft technology and architecture

AgentProof uses Microsoft and GitHub technology as part of the product
mechanism, not as decoration:

- GitHub Actions runs no-secret analysis and trusted publication workflows.
- GitHub checks, artifacts, pull-request comments, reviews, rulesets, and
  CODEOWNERS provide the enforcement and audit boundary.
- GitHub Copilot App/plugin surfaces provide isolated read-only specialist
  sessions, a manual assembler, and the Evidence Board canvas.
- Node.js, TypeScript, JSON Schema, SHA-256 canonicalization, and Vitest make
  the evidence contract reproducible and testable.

### Impact and measurement

Do not enter targets as achieved results. Capture a baseline and a trial, then
report the actual values in the final submission notes:

| Metric                    | Definition                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| Evidence time             | Minutes from pull-request open to complete same-SHA evidence.                                    |
| Human review effort       | Human minutes spent locating facts and deciding what to do.                                      |
| Pre-merge detection       | Material findings discovered before merge.                                                       |
| Explicit disposition rate | Percentage of `unknown` or eligible `exception` findings with a current, authorized disposition. |
| Stale-decision rejection  | Unauthorized or stale SHA-bound decisions rejected by the system.                                |
| Governed merge rate       | Merges with current evidence and independent approval.                                           |

The intended business outcome is safer adoption of AI-assisted engineering
with less release-manager toil and fewer stale or untraceable decisions.

### Trust, safety, and limitations

- Analysis runs without secrets and with read-only repository access.
- Publication runs trusted base/default-branch code and validates live GitHub
  state before writing.
- Reviewer sessions are advisory and manually started in the supported MVP.
- Exceptions are eligibility-checked, authorized, reasoned, expiring, and
  bound to the current SHA.
- A new commit invalidates previous evidence, dispositions, and stale
  approvals.
- The system does not prove universal authorship, model provenance, legal
  compliance, security, privacy, or production suitability.
- The canvas is mutable and cannot replace GitHub's authoritative records.

### Required demo video

**Recommended upload name:** `agentproof-trustworthy-agentic-delivery.mp4`

**Required story:** unsafe pull request -> red gate -> same-SHA evidence ->
bounded human disposition -> remediation -> stale-SHA invalidation -> fresh
evidence -> green gate -> independent approval -> disabled unsafe-automation
canary.

**Current checked-in asset:** `assets/agentproof-silent-draft.mp4`. It is a
1920x1080, 30 fps, 174-second silent timing draft with a persistent
`PRECOMPUTED / NOT LIVE` banner. It is not the final live proof and must be
replaced with the live GitHub/App capture plus voiceover before upload.

**Current platform media constraints:** MP4, MOV, AVI, MKV, or WebM; maximum
100 MB; maximum 5 minutes. The planned final cut is 2:54 to leave editing
margin. The complete recording procedure is in
[video-recording-guide.md](video-recording-guide.md), and the voiceover is in
[video-script.md](video-script.md).

### Collaboration and project settings

Complete these account-controlled fields in Innovation Studio before final
submission:

| Field                    | Recommended choice                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Team                     | List only people who materially contributed; assign clear roles such as product/demo lead, engineering lead, and reviewer/governance lead. |
| Open to new team members | **No** for the final polished submission unless active recruitment is genuinely needed.                                                    |
| Open to invitations      | **No** after the demo story and ownership are stable.                                                                                      |
| Participation mode       | Select the actual mode used by the team; do not claim an in-person venue or partner participation that did not occur.                      |
| Challenge links          | One executive challenge: **Hack to Make Agents Trustworthy**.                                                                              |
| Project visibility       | Use the visibility required by the event, but do not expose private repositories, tenant links, or personal notifications in media.        |
| Media                    | Upload the final live demo video and one or two clean architecture/product stills only after privacy review.                               |

### Final submission checklist

- [ ] Title, tagline, and description are pasted exactly from this packet.
- [ ] Keywords are entered as searchable terms, not a paragraph.
- [ ] Exactly one executive challenge is linked.
- [ ] The live demo video replaces the silent draft and contains voiceover and
      captions.
- [ ] The video is under 100 MB and under 5 minutes.
- [ ] The unsafe and remediated full SHAs are visible and different.
- [ ] The final artifact digest and green gate match the final SHA.
- [ ] The independent reviewer is distinct from the author and release
      decision-maker.
- [ ] Baseline/trial metrics are actual observations, not targets.
- [ ] No secrets, customer data, tenant links, account details, or
      notifications appear.
- [ ] The final claims remain bounded to the repository, policy, and SHA.

The strongest proof is a live red-to-green release decision:

1. An unsafe pull request fails on the current head SHA.
2. Deterministic collectors produce bounded findings without secrets.
3. Read-only specialist sessions explain the same-SHA evidence.
4. A release manager records a bounded, expiring decision only where policy
   allows it.
5. Remediation creates a new SHA and invalidates the old evidence.
6. Fresh evidence and an independent approval make merge available.

The packet never presents the mutable Evidence Board as an immutable audit
record. GitHub commits, checks, comments, reviews, rules, and artifacts remain
the authoritative record.

## Media status

The checked-in MP4 in `assets/` is a **silent precomputed draft** with
on-screen `PRECOMPUTED / NOT LIVE` labels. It is a timing and voiceover aid,
not the final proof. Replace its cue cards with the live GitHub/App capture
described in `video-recording-guide.md` before submitting.

No file in this folder should contain secrets, customer data, tenant links,
personal notifications, or unredacted account identifiers.
