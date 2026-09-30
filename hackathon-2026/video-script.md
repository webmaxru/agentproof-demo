# Video script — AgentProof

**Target runtime:** 2:54  
**Format:** 16:9, 30 fps, live screen capture plus later voiceover  
**Narration owner:** Presenter records voiceover after picture lock  
**Opening state:** Unsafe synthetic pull request with a red gate  
**Closing state:** Green gate, independent approval, and the disabled permission
canary  
**Do not submit:** The silent draft in `assets/` is timing/reference footage
only and is permanently labeled `PRECOMPUTED / NOT LIVE`.

**Conditional closing:** the green retention gate requires a real authorized
human exception; independent approval requires a different authorized human.
The private repository currently lacks ruleset/branch-protection entitlement.
Omit merge-enforcement claims until that prerequisite is resolved and tested.
Approval-dismissal footage also requires a genuine prior independent approval.
See [the actual setup record](../docs/github-setup.md), not historical media,
for the state available to record.

## Script conventions

- **Picture:** What must be visible.
- **Action:** What the presenter does.
- **On-screen text:** Caption or lower-third.
- **Voiceover:** The sentence to record.
- **Edit note:** Timing, emphasis, or fallback rule.

## 0:00–0:14 — Start with the trust gap

**Picture:** Unsafe synthetic pull request overview. Show the current head SHA,
the AI-assistance origin declaration, and the red `AgentProof / gate`.

**Action:** Move the cursor from the PR title to the full SHA, then to the
failed gate. Do not open a terminal or show unrelated browser chrome.

**On-screen text:** `AI-ASSISTED CHANGE — CURRENT HEAD SHA`

**Voiceover:**

> AI can help build software quickly. The release question is different: did
> this exact change earn evidence and an accountable decision?

**Edit note:** Hold the full SHA long enough to read. The next cut must be the
red gate, not a title card.

## 0:14–0:31 — Show deterministic evidence and same-SHA reviewers

**Picture:** Open the failed check, then the final/raw evidence link. Show the
repository, pull request number, policy identity, and head SHA. Cut through
the Test Reviewer, Security Reviewer, and Policy Reviewer results.

**Action:** Highlight one concrete finding in each reviewer result. Do not imply
that reviewer prose computes or overrides the gate.

**On-screen text:** `DETERMINISTIC EVIDENCE` and
`READ-ONLY SPECIALISTS — SAME SHA`

**Voiceover:**

> AgentProof runs deterministic collectors without secrets and binds the result
> to the pull-request head SHA. Read-only specialist sessions add context for
> tests, security, and policy, but they remain advisory.

**Edit note:** If a reviewer page does not show the SHA directly, show the
assembled fragment metadata or omit that page rather than asking the viewer to
trust the narration.

## 0:31–0:51 — Explain the mutable board boundary

**Picture:** Evidence Board loaded with the unsafe evidence. Show the failed
dependency finding, failed authorization-test finding, retention unknown, and
the authority banner.

**Action:** Select each finding once. Pause on the banner that says the board is
mutable coordination state and GitHub is authoritative.

**On-screen text:** `MUTABLE COORDINATION VIEW — GITHUB IS AUTHORITATIVE`

**Voiceover:**

> The assembler rejects mixed repositories, policies, or SHAs. The board helps
> people coordinate, but it is mutable. The GitHub check, artifact, comments,
> reviews, and commit remain the authoritative record.

**Edit note:** Avoid a long canvas interaction. The audience needs the
authority boundary, not every field in the UI.

## 0:51–1:09 — Show a bounded human decision

**Picture:** Pull request comment box with the exact exception command drafted.
Show the eligible retention finding, current SHA, specific reason, and expiry.
Submit only after all four are visible.

**Action:** Paste the prepared command, verify the live finding ID and SHA, then
submit from the authorized release-manager identity.

**On-screen text:** `HUMAN DISPOSITION — ELIGIBLE, EXPLICIT, EXPIRING`

**Voiceover:**

> A release manager may accept only a policy-eligible finding, with a specific
> reason and an expiry. This is not an approval, and it does not excuse the
> non-exceptionable failures.

**Edit note:** If the comment form contains a real login, customer link, or
unredacted repository, stop and retake the shot.

## 1:09–1:33 — Remediate and create a new SHA

**Picture:** Prepared remediation session or pull-request diff. Show the
dependency upgrade and restoration of the stable authorization-test marker.
Push the real remediation commit.

**Action:** Highlight only the relevant diff, then show the new commit in the
pull request.

**On-screen text:** `REMEDIATION COMMIT — NEW HEAD SHA`

**Voiceover:**

> The preferred path is remediation. The dependency is upgraded and the
> authorization-test marker is restored. The passing denial behavior never
> changed. The push creates a new head SHA, so this is
> now a new release decision.

**Edit note:** Do not show a long build log. Keep the diff and the new SHA
readable.

## 1:33–1:51 — Prove stale evidence is rejected

**Picture:** Pull request after synchronization. Show the new SHA, old
disposition marked stale or ineffective, and fresh workflow activity. Include
dismissed approval only if a genuine prior independent approval and enforced
stale-review setting were demonstrated.

**Action:** Compare the old and new SHA visually. Do not claim that a stale
decision is silently carried forward.

**On-screen text:** `NEW SHA — PRIOR EVIDENCE AND DECISION STALE`

**Voiceover:**

> The new revision needs fresh evidence and a new SHA-bound decision.
> AgentProof does not carry the old exception forward.

**Edit note:** This is the most important trust proof. Give it more screen
time than the implementation details.

## 1:51–2:12 — Fresh evidence for the remediated head

**Picture:** Completed deterministic result for the new SHA, followed by fresh
same-SHA specialist fragments and a new assembly result. Show any remaining
retention disposition drafted against the new SHA.

**Action:** Match the new SHA in the check, artifact, reviewer fragments, and
disposition. Show the evidence digest.

**On-screen text:** `FRESH SAME-SHA EVIDENCE`

**Voiceover:**

> Fresh collectors and fresh specialist notes now describe the remediated
> commit. Any remaining exception is recorded again against this SHA, never
> copied from the previous revision.

**Edit note:** If the live workflow is still running, use the completed live
check after it finishes. Do not use the synthetic JSON as if it were scanner
output.

## 2:12–2:32 — Green gate, then independent approval

**Picture:** Final green `AgentProof / gate`, final artifact digest, and matching
head SHA. Transition to the independent reviewer profile and show approval.

**Action:** First show the green check, then the reviewer approval. Do not merge.

**On-screen text:** `GREEN GATE + INDEPENDENT REVIEW`

**Voiceover:**

> The gate turns green only when the current evidence, policy, disposition, and
> artifact digest agree. A different human still reviews the change. Evidence
> alone cannot approve. Blocking merge also requires enabled and verified
> repository protections.

**Edit note:** Show merge availability only if protection enforcement was
actually demonstrated. Otherwise disclose the private-plan blocker and leave
the merge action untouched.

## 2:32–2:43 — State the enterprise boundary

**Picture:** One clean architecture or limits frame. Show the words
`BOUNDED EVIDENCE`, `NO UNIVERSAL PROVENANCE`, and `NO AUTOMATIC APPROVAL`.

**Action:** Use a quick 3-card cut; do not introduce new product claims.

**On-screen text:** `BOUNDED TO REPOSITORY + POLICY + SHA`

**Voiceover:**

> This is bounded evidence for one repository, policy, and commit. It does not
> prove universal authorship, legal compliance, or production suitability.

**Edit note:** Keep this honest limitation visible before the final boundary
test.

## 2:43–2:54 — Fail closed on unsafe automation

**Picture:** Disabled permission-canary result. Show the exposed mutation
capabilities, `UNSAFE_TOOL_BOUNDARY`, and disabled status. End on the project
limits.

**Action:** Point to `apply_patch`, `bash`, and the stop result. Do not launch
or re-enable the automation.

**On-screen text:** `PERMISSION CANARY — DISABLED`

**Voiceover:**

> An earlier upstream trial tested the automation boundary. Mutation tools remained visible, so
> AgentProof stopped before using them and the trigger was disabled. Refusing an
> unsafe runtime is part of the product.

**Edit note:** Cut to black at 2:54. Do not add an outro, logo animation, or
unbounded claim after the boundary result.

## Optional alternate voiceover opening

If the presenter wants a more executive opening, replace the first two
sentences with:

> The enterprise opportunity is not just more AI-generated code. It is more
> accountable software delivery. AgentProof makes the release decision follow
> the exact commit that earned the evidence.

Keep the same picture and timing.
