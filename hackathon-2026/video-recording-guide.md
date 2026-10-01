# Video recording guide

This guide prepares a polished, voiceover-ready product video for AgentProof.
It assumes that the presenter will capture the live GitHub/App sequence first
and add narration later. The recording is designed to prove a trustworthy
agentic-delivery control loop, not to present a compliance certification or
claim universal model provenance.

**Reference-repository preflight:** use `webmaxru/agentproof-demo` and the actual
run/settings record in [GitHub setup](../docs/github-setup.md). On 2026-10-01
the public repository's active no-bypass delivery rules and protected main
were verified natively. Independent code-owner onboarding and the candidate
automatic-refresh repair's protected-main rollout are still pending.
All recording PRs remain draft; a draft-disabled Merge button is not evidence
of required-check or review enforcement. Record that transition only after
appropriate human onboarding, readiness, and real review. A retention
exception and independent approval are human actions, not recording assets.

## 1. Final deliverable

Produce one 16:9 video with a maximum runtime of **2 minutes 54 seconds**.
Use the following deliverables while editing:

| Deliverable                    | Required    | Description                                                                         |
| ------------------------------ | ----------- | ----------------------------------------------------------------------------------- |
| `agentproof-live-master.mp4`   | Yes         | Final video with live GitHub/App footage and voiceover.                             |
| `agentproof-live-master.srt`   | Recommended | Human-readable captions matching the final narration.                               |
| `agentproof-silent-draft.mp4`  | Optional    | Timing/reference draft. It must remain labeled as precomputed and not live.         |
| `agentproof-shot-log.md`       | Recommended | Actual takes, source URLs, SHAs, and any continuity substitutions.                  |
| `agentproof-privacy-review.md` | Recommended | Confirmation that no secrets, customer data, tenant links, or personal UI appeared. |

The final master must not imply that the silent draft is live evidence. If a
fallback clip or fixture is used, keep `PRECOMPUTED / NOT LIVE` on screen for
the entire fallback segment and state the substitution in the shot log.

## 2. The story the video must prove

The audience should understand five things without reading the repository:

1. AI-assisted changes can be productive but are not automatically trusted.
2. AgentProof evaluates the exact pull-request head SHA with deterministic,
   no-secret evidence.
3. Human specialists add context but cannot override the deterministic gate.
4. A human disposition is bounded by policy and the SHA that was evaluated.
5. A new commit invalidates old evidence; only fresh evidence and independent
   approval make merge available.

The key sentence to build toward is:

> The hard problem is not who typed the code. It is whether this exact change
> earned evidence and an accountable decision.

## 3. Prepare the repository and live state

Complete these steps before opening the recorder:

1. Start from a clean, known branch and record the exact commit IDs in a
   presenter-only note. Do not put private links or credentials in the video
   folder.
2. Use the synthetic repository and synthetic expense data only.
3. Prepare an unsafe pull request that produces the intended dependency,
   authorization-test, and retention findings.
4. Prepare the real remediation commit that fixes the dependency and restores
   the authorization-test marker while leaving the intentionally bounded
   retention scenario available for the human-disposition step.
5. Wait for the deterministic analysis and publish workflows to finish for the
   unsafe head SHA before starting specialist sessions.
6. Start the Test Reviewer, Security Reviewer, and Policy Reviewer manually in
   isolated read-only sessions. Review the tool confirmation each time.
7. If the host exposes a mutation-capable built-in or cross-repository access,
   stop and show the fail-closed `UNSAFE_TOOL_BOUNDARY` result later. Do not
   continue with that automation.
8. Run the Evidence Assembler manually after all three specialist fragments
   refer to the same repository, PR, base SHA, policy digest, and head SHA.
9. Prepare the exact authorized exception command, but do not submit it until
   the live finding ID, SHA, reason, and expiry are visible.
10. Prepare an independent reviewer account or profile. The author or release
    decision-maker must not approve the pull request.
11. Keep the unsafe PR at its original head until its first human disposition is
    captured. A separately prepared remediation PR is not a substitute for the
    later recorded same-PR transition.
12. A human operator must mark setup PR #4 ready before requesting its human
    review and protected-main rollout. After that rollout, mark recording PR #5
    ready before independent-approval or merge-availability shots. Ready status
    preserves its head but triggers revalidation; wait for the repaired fresh
    check/artifact. Keep current drafts/heads unchanged during preparation.

## 4. Privacy and recording controls

### Browser profile

- Use a clean browser profile or a dedicated browser window.
- Hide bookmarks, extensions, account avatars, unread counts, messaging
  overlays, notifications, tenant names, and unrelated tabs.
- Keep only the GitHub PR, check/artifact pages, reviewer sessions, Evidence
  Board, and the sanitized repository view.
- Do not record a password manager, credential prompt, authentication dialog,
  email, chat, calendar, customer name, customer URL, or private source tree.

### Repository and data

- Use synthetic identities and the synthetic expense repository.
- Redact repository owners if the live repository is private.
- Keep full SHAs visible where they prove binding, but never show tokens,
  secrets, environment variables, customer identifiers, or tenant links.
- Never paste a real exception rationale or real customer data into a PR.
- Do not describe scanner output as a legal, privacy, security, or compliance
  determination.

### Capture settings

- Resolution: 1920x1080 if the source window supports it; otherwise 1280x720.
- Frame rate: 30 fps.
- Cursor: visible, medium size, with a subtle highlight if available.
- Browser zoom: 100–110%; increase only until the full SHA, finding state, and
  check name are readable.
- Audio: record scratch audio if helpful, but plan to replace it with the final
  voiceover.
- Notifications: disable Windows, Teams, Outlook, GitHub, and browser
  notifications for the recording session.
- Use a single consistent dark/light theme; do not switch themes mid-take.

## 5. Window and tab preparation

Open the following in storyboard order and rename tabs if the browser permits:

1. Unsafe pull request overview.
2. Unsafe `AgentProof / gate` check and artifact.
3. Test Reviewer result.
4. Security Reviewer result.
5. Policy Reviewer result.
6. Evidence Board with the unsafe evidence loaded.
7. PR comment box with the exception skeleton ready but not submitted.
8. Remediation diff/session.
9. New head SHA and stale-disposition view.
10. Fresh evidence and new exception draft.
11. Final green gate and final artifact digest.
12. Independent reviewer approval view.
13. Disabled permission-canary result and the project limitations.

Before recording, click through the sequence once without recording. Close any
tab that reveals an account, notification, or unrelated repository.

## 6. Live recording procedure

Use `video-script.md` as the authoritative timing sheet. The following
procedure is the operational version:

### Take A — unsafe head

1. Begin on the unsafe PR, not on a title slide.
2. Pause long enough to read the origin declaration and full head SHA.
3. Open the red `AgentProof / gate`.
4. Show the evidence artifact and match its repository, PR number, policy
   digest, and head SHA.
5. Show the three isolated specialist results. Each result must display or
   clearly identify the same head SHA.
6. Open the Evidence Board and point out the mutable-coordination banner.
7. Draft the retention exception in the PR comment box.
8. Submit only the authorized, eligible, current-SHA exception.

### Take B — remediation and invalidation

1. Switch to the prepared remediation view.
2. Show the dependency fix and authorization-test marker restoration.
3. Push the real remediation commit.
   The strict up-to-date rule also requires the human-controlled transition
   to incorporate the then-current protected main, preserving its reviewed
   controls/workflows and onboarded owners. Do not advance the current unsafe
   head before its first recorded human disposition. The prepared separate
   PR #6 head is not automatically the final up-to-date PR #5 head.
4. Return to the pull request and wait for the new head SHA to appear.
   Resolve its actual full base/head again and collect new evidence; main
   advances from human onboarding/repair rollout invalidate old-base captures,
   even where the earlier subject head had not changed.
5. Show the old disposition/evidence becoming stale or ineffective.
6. Show old-approval dismissal only if a genuine prior independent approval and
   enforced stale-review setting exist. Otherwise omit that shot and explicitly
   mark it **HUMAN NOT PERFORMED**; never fabricate an approval.

### Take C — fresh evidence and independent review

1. Open the fresh deterministic result for the new head SHA.
2. Start fresh read-only specialist sessions if their notes are shown.
3. Assemble only same-SHA fragments.
4. Record a new retention exception if it is still required.
5. Show the final green gate and matching artifact digest.
6. Switch to the distinct reviewer profile and approve the pull request.
7. Show merge becoming available only on an appropriate human-readied PR after
   actual protection and independent review have been demonstrated. Otherwise
   disclose the missing human/rollout prerequisites and omit that shot. Do not
   merge or treat the current draft state as enforcement proof.

### Take D — boundary and limitation

1. Show the disabled permission canary.
2. Keep the `UNSAFE_TOOL_BOUNDARY` result visible.
3. Show the limits slide or README excerpt:
   - manual reviewer sessions;
   - manual assembly;
   - mutable canvas;
   - bounded evidence rather than universal provenance or compliance;
   - no automatic approval or merge.

## 7. Voiceover and pacing

Record narration after the picture lock. Use a conversational pace of roughly
130–150 words per minute. Leave at least 0.5 seconds of silence around
transitions and 1.0 second when a full SHA, finding state, or evidence digest
must be read visually.

The narration should:

- state the problem before naming implementation details;
- explain why the exact SHA matters;
- distinguish deterministic evidence from advisory agent prose;
- call out the human decision and independent approval;
- describe the failed permission canary as a deliberate stop;
- avoid claims such as “compliant,” “secure,” “verified author,” “immutable,”
  “automatic approval,” or “live reviewer automation.”

The full voiceover text is in `video-script.md`. It is intentionally written as
short sentences so it can be recorded in separate takes and edited cleanly.

## 8. Editing recipe

1. Put the live unsafe PR at the first frame.
2. Cut on UI transitions, not on narration breaths.
3. Use hard cuts or short 150–250 ms dissolves; avoid decorative transitions.
4. Add a small lower-third only when a new concept appears:
   - `CURRENT HEAD SHA`
   - `DETERMINISTIC EVIDENCE`
   - `HUMAN DISPOSITION`
   - `NEW SHA — PRIOR DECISION STALE`
   - `INDEPENDENT REVIEW`
5. Add captions for every spoken sentence.
6. Keep the SHA and check name at least 32 px high in the 1080p master.
7. Blur or crop private UI before adding any zoom.
8. If a live page loads slowly, cut to the already completed live check rather
   than inserting the synthetic fixture.
9. If a fallback is unavoidable, add the persistent
   `PRECOMPUTED / NOT LIVE` banner before the first fallback frame.
10. End on the disabled-canary limitation, not on a claim of automatic safety.

## 9. Post-production verification

Run these checks before sharing the draft:

- Runtime is no longer than 2:54.
- The unsafe and remediated SHAs are different and each visible evidence result
  matches the correct one.
- Every specialist result is same-SHA or omitted.
- The exception names the live finding ID and current SHA.
- The final artifact digest matches the displayed final evidence.
- The independent reviewer is distinct from the author and release
  decision-maker.
- No notifications, account details, secrets, customer data, tenant links, or
  unrelated repositories appear.
- The silent draft is labeled precomputed and is not being submitted as live
  proof.
- The final voiceover does not turn bounded evidence into a legal or compliance
  conclusion.

## 10. Required shot log

Create `assets/agentproof-shot-log.md` after the final take and record:

```text
take:
unsafe_head_sha:
remediated_head_sha:
pr_number:
final_artifact_digest:
workflow_run_urls:
reviewer_session_labels:
exception_finding_id:
exception_expiry:
independent_reviewer:
fallback_segments:
privacy_reviewed_by:
reviewed_at:
```

Keep the shot log free of tokens, customer data, tenant links, and private
evidence that is not required to reproduce the recording.
