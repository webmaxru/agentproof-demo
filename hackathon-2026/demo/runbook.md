# AgentProof demo runbook

## Truth rule

Show live GitHub/App state whenever available. A completed real check may be
opened after it ran; that is still a real record. If any screenshot, clip, or
fixture substitutes for live state, display **PRECOMPUTED / NOT LIVE** for its
entire use and say so. Never present `../../demo/synthetic-findings.json` as scanner
output.

## Hackathon 2026 submission preflight

The recommended executive challenge is [Hack to Make Agents
Trustworthy](https://innovation-studio.microsoft.com/events/hackathon2026/challenges/executive-challenges).
The recording must prove the product thesis, not merely describe the
architecture:

- Start with the unsafe PR and end with fresh same-SHA evidence plus
  independent approval.
- Show the full head SHA, deterministic `AgentProof / gate`, evidence digest,
  bounded disposition, remediation commit, and stale-SHA invalidation.
- Record measured baseline-versus-trial outcomes; never substitute targets for
  results.
- Replace every placeholder and remove account details, notifications,
  customer data, tenant links, secrets, and unrelated browser content.
- Keep the permission canary disabled and describe `UNSAFE_TOOL_BOUNDARY` as a
  deliberate fail-closed result.
- Keep the complete sequence within the existing 2:54 storyboard and verify
  the final upload deadline in Innovation Studio before submission.

## Required placeholders

- Repository: `<OWNER>/<REPO>`
- Unsafe PR: `<PR_URL>`
- Unsafe head: `<UNSAFE_40_CHAR_SHA>`
- Remediated head: `<REMEDIATED_40_CHAR_SHA>`
- Release manager: `<RELEASE_MANAGER_LOGIN>`
- Independent reviewer: `<INDEPENDENT_REVIEWER_LOGIN>`
- Expiry (within base-policy maximum): `<YYYY-MM-DD>`
- Session/deep links: `<TEST>`, `<SECURITY>`, `<POLICY>`, `<ASSEMBLER>`,
  `<REMEDIATION>`

Reviewer sessions and the Evidence Assembler are manual. Installed-agent and
deep-link launches require the presenter to review and confirm; open all needed
tabs in advance rather than implying that a link silently creates a session or
automation.

## Historical upstream baseline (not new live evidence)

On 2026-09-02, PR-triggered `AgentProof Analysis` and `AgentProof Publish`
succeeded in a different private repository and produced the full-SHA-bound
`AgentProof / gate`, artifact, and PR summary. The historical private identifier
is omitted rather than reassigned to this repository. Install the current kit
from the `webmaxru/AgentProof` marketplace; no new installation is claimed here.

On 2026-09-03, the private automation lab exposed all three repository reviewer
profiles after project selection, and a disposable candidate fired on PR opened
and synchronized. After the picker was reduced from 50 tools to 21 read-only
operations, the runtime still reported `functions.apply_patch`,
`functions.bash`, and broader Actions access. It returned
`UNSAFE_TOOL_BOUNDARY`, made no automation mutation, and was disabled. Do not
narrate three personal reviewer automations; the working sequence uses three
isolated, manually started, read-only sessions.

See [current GitHub setup](../../docs/github-setup.md) for this repository's
actual runs and installed-versus-candidate state. Public main now has a
verified active no-bypass ruleset and both code owners; PR #4 is merged.
Rollout step 5 verified PR #10's actual metadata controller -> bot Analysis ->
explicit Publisher. Step 6's batch succeeded for PR #10 but failed for frozen
old-base PR #5/#6 before Publisher dispatch. The follow-up old-base repair
still needs human review/rollout and native verification of those failed jobs.
Keep the frozen scenario heads/drafts unchanged; draft-disabled Merge is not
a check-enforcement test. Do not narrate a successful whole batch or deployed
old-base repair from PR #10's successful path.

The 2026-10-01 live audit now reports high advisories for the previously safe
Fastify 5.12.1 resolution. PR #4's separate dependency fix pins 5.12.5 and
passes the current production audit with one allowed moderate finding.
Earlier safe/PR #6 audit receipts are historical: frozen PR #6's standalone
head is **not a current passing dependency remediation**. Do not reuse its
old five-pass/retention-unknown result as a fresh scan.

The narrow dependency/lock fix from PR #4, commit
`f2d89fd432658753346e152a2f20cbdd030cf8ff`, and both CODEOWNERS are now installed.
Preserve them. The agent cannot substitute a guessed reviewer, exception,
bypass, or merge for independent human review of the follow-up repair.

The installed strict check rule requires an up-to-date branch. Later human
repair rollout will advance main. The presenter helper must then use that clean
protected workflow revision and independently fetch the immutable PR-base policy;
main advancement does not itself update these PR heads/bases. Keep PR #5/#6
heads frozen now. After the first
recorded disposition, the human-recorded remediation transition must include
the then-current protected main without losing its owners, controls, or
reviewed dependency/lock fixes. Include the current patched dependency and
the prepared authorization-marker restoration, while retaining incomplete
retention. The prepared PR #6 head is not automatically the new PR #5 head.
Resolve the resulting full SHA/base and collect fresh evidence before further
decisions.

Setup PR #4 is already merged. After the new repair's human-controlled
protected-main rollout and native old-base verification, mark PR #5 ready before relying on
independent approval or merge-availability UI. This does not advance its head,
but it triggers revalidation; wait for the repaired current-head check. These
are later operator steps, not agent changes to the current drafts.

## T-24 hours

1. Run `npm ci` and `npm run check`.
2. Verify the selected vulnerable dependency still produces the expected real
   normalized advisory; if advisory service behavior changed, repair the demo
   before recording rather than relabel a fixture as live.
3. Validate unsafe patch on a disposable branch and confirm exactly the
   intended dependency fail, missing-authorization-test fail, and retention
   unknown.
4. Validate the real remediation commit upgrades the dependency and restores
   the stable marker on the existing authorization test without completing the
   retention declaration.
5. Exercise unauthorized, stale-SHA, edit/delete, expiry, red-with-approval, and
   green-without-approval acceptance tests.
6. Confirm action pins, workflow permissions, manual reviewer read scopes, and
   ruleset. Confirm no secret/customer data exists.
7. Confirm the permission-canary automation is disabled, its result remains
   non-sensitive, reviewer templates are labeled blocked, and no live reviewer
   automation is claimed.
8. Cold-review the 2:54 storyboard with one technical and one non-technical
   viewer.

## T-30 minutes

1. Use a clean browser profile; hide bookmarks, notifications, tenant/account
   details, and unrelated repositories.
2. Sign in presenter/release manager in the main profile and independent
   reviewer in an isolated profile.
3. Set zoom so SHA, check name, finding states, and captions are readable.
4. Wait for the unsafe head's deterministic Analysis/Publish path to complete.
   Then manually start the installed Test, Security, and Policy agents in three
   isolated, read-only sessions (or review and confirm their deep links).
5. Match every session to the full unsafe head SHA, manually run the Evidence
   Assembler, and load the resulting document into the mutable Evidence Board.
6. Open tabs in storyboard order:
   - unsafe PR body and red `AgentProof / gate`;
   - three manually started specialist session results;
   - Evidence Board loaded with unsafe-head evidence;
   - release-manager PR comment box;
   - remediation session with the real diff ready to push;
   - Actions/PR view ready to show stale and then fresh evidence;
   - independent-review profile;
   - disabled permission-canary result, README/templates, and three-slide
     outline.
7. Copy the exact unsafe and expected remediated SHAs into presenter-only notes.
8. Pre-type only the allowed exception skeleton; verify finding ID, full live
   SHA, rationale, and expiry immediately before submission.
9. Start recording at the PR, not a title slide.

## Exact live sequence

Follow `storyboard.md` without adding time:

1. **0:00:** show unsafe SHA/origin and red gate.
2. **0:14:** show check evidence and all three manually started, read-only,
   same-SHA sessions.
3. **0:31:** show the manual assembly result, three findings, and mutable-canvas
   authority banner.
4. **0:51:** submit the retention exception:

   ```text
   /agentproof accept-exception AP-POL-RETENTION-001
   sha: <UNSAFE_40_CHAR_SHA>
   reason: Synthetic demo data remains bounded while the retention declaration is corrected.
   expires: <YYYY-MM-DD>
   ```

   Use the actual stable finding ID emitted by the check if it differs.

5. **1:09:** show and push real dependency/test remediation.
6. **1:33:** match the live new SHA and show the previous exception is stale.
7. **1:51:** open fresh same-SHA evidence and submit a newly generated retention
   exception using `<REMEDIATED_40_CHAR_SHA>`.
8. **2:12:** show green gate and match final evidence SHA/digest.
9. **2:32:** approve from the distinct reviewer profile; show merge available,
   but do not merge.
10. **2:43:** show the disabled canary's `apply_patch`, `bash`, and
    `UNSAFE_TOOL_BOUNDARY` result, then the kit boundaries; stop by **2:54**.

## Go/no-go checks while recording

- Stop if a displayed evidence/check/comment SHA differs from the live PR head.
- Stop if any specialist fragment is for another SHA.
- Stop if a reviewer was started before the deterministic check completed or
  has more than the required read tools.
- Stop if the permission canary is enabled or if its failed result is described
  as a functioning reviewer automation.
- Stop if an account, notification, secret, customer/tenant identifier, or
  unrelated content appears.
- Stop if ruleset or check behavior differs from the narration.
- Do not call a network/tool failure a pass.
- Do not say “compliant,” “secure,” “verified author,” “immutable canvas,”
  “automation-as-code,” “three live reviewer automations,” “safe automation
  runtime,” or “automatic approval.”

## Continuity fallback

If a live App surface fails or a workflow exceeds the segment budget, follow
`../fallback/README.md`. Use only a previously captured real run or the
synthetic fixture with the required persistent label. State what is simulated,
return to live GitHub authority as soon as possible, and never splice a
different SHA into the same claimed evidence chain.

## After the take

1. Verify runtime is at most 2:54 and captions are readable.
2. Frame-check every second for private data.
3. Confirm every SHA and claim against GitHub/repository evidence.
4. Confirm any fallback is continuously labeled and mentioned.
5. Preserve the chosen real check/artifact URLs under approved retention.
6. Perform [cleanup](../../docs/cleanup.md) after submission.
