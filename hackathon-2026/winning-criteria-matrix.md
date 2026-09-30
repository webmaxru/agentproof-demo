# Winning-criteria matrix

This matrix turns the project into a submission checklist. It separates what
the repository already demonstrates from what must be shown in the live
recording. It deliberately avoids claiming a legal, compliance, security, or
provenance determination.

## Executive summary

**Positioning:** AgentProof makes AI-assisted software delivery trustworthy by
binding deterministic evidence and accountable human decisions to the exact
commit that would be released.

**Primary challenge fit:** Hack to Make Agents Trustworthy.

**Proof pattern:** unsafe change -> red gate -> same-SHA specialist context ->
bounded human disposition -> remediation -> new-SHA invalidation -> fresh
evidence -> independent approval.

## Matrix

| Winning criterion                     | What judges need to see                                                        | Current project evidence                                                                                                                                                                                                    | Required recording proof                                                                                                                                      | Status                            |
| ------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Meaningful problem and customer value | A painful problem, a clear user, and a measurable outcome.                     | The project addresses the gap between fast AI-assisted coding and accountable release decisions. Roles, trust boundaries, and success measures are documented in the root README and architecture docs.                     | Open with the unsafe PR and explain the release-manager pain in one sentence. Show the red-to-green workflow and state the baseline/trial metrics to measure. | Ready for live proof              |
| Originality and innovation            | A distinctive insight, not a generic chatbot or wrapper.                       | The product is commit-bound evidence and human governance, not code generation. It distinguishes deterministic collectors, advisory specialists, human disposition, and independent approval.                               | Show the old SHA becoming stale after remediation. This is the memorable differentiator.                                                                      | Ready for live proof              |
| Technical quality                     | A working, coherent, reproducible implementation.                              | GitHub Actions analysis/publish workflows, protected-base policy evaluation, versioned evidence schema, SHA/digest checks, disposition validation, plugin reviewers, assembler, and Evidence Board are implemented.         | Show one completed live check, the evidence artifact, matching SHA/digest, and the final green check.                                                         | Ready for live proof              |
| Microsoft technology alignment        | Meaningful use of Microsoft/GitHub technology, not logo placement.             | The solution uses GitHub Actions, GitHub checks/artifacts/comments/reviews/rules, GitHub Copilot App/plugin surfaces, and a Copilot Evidence Board extension.                                                               | Keep the GitHub/Copilot surfaces visible and explain what each contributes. Do not add a service only for branding.                                           | Ready                             |
| Trustworthy and responsible AI        | Guardrails, least privilege, human accountability, and honest limits.          | No-secret analysis, read-only reviewer profiles, protected-base policy, distinct evidence states, fail-closed unknowns, bounded exceptions, independent review, and a disabled permission canary are documented and tested. | Show the mutable-board authority banner, the bounded exception, independent approval, and `UNSAFE_TOOL_BOUNDARY`.                                             | Ready for live proof              |
| User experience                       | A workflow that a real operator can understand and use.                        | The flow has explicit roles, human checkpoints, reviewer specialists, assembler, and a visual Evidence Board. The packet includes a timed storyboard and capture guide.                                                     | Keep each UI state on screen long enough to read the SHA, finding state, and check name. Use the scripted lower-thirds.                                       | Ready for live proof              |
| Business impact and scale             | A credible path beyond a one-off demo.                                         | The kit is model-neutral, policy-versioned, repository-adaptable, and includes customer adaptation guidance, success measures, and a roadmap for enforceable least privilege and signed attestations.                       | State the measurable trial plan and show how the same control loop applies to other repositories and policies. Do not present targets as achieved.            | Ready with measured results       |
| Security and data discipline          | The demo does not leak sensitive data and the design handles trust boundaries. | Synthetic expense data only; no secrets in analysis; explicit trust-boundary and threat-model documentation; no customer data in prompts, fixtures, logs, or media.                                                         | Use a clean browser profile and show only synthetic/redacted material. Complete the privacy checklist and shot log.                                           | Ready with final privacy review   |
| Demo quality and storytelling         | A concise, credible narrative with visible proof.                              | A 2:54 storyboard, time-coded script, recording guide, checklist, caption file, and silent timing draft are checked in under this folder.                                                                                   | Replace cue cards with live capture, record voiceover, keep the full sequence within 2:54, and end on the honest automation boundary.                         | Draft ready; live capture pending |
| Reproducibility and handoff           | Another person can repeat the demo and understand what is real.                | Runbook, fallback rules, shot-log template, artifact manifest, and explicit `PRECOMPUTED / NOT LIVE` labeling are included.                                                                                                 | Fill the shot log with real SHAs, workflow URLs, reviewer labels, digest, expiry, and privacy reviewer after the final take.                                  | Ready for final take              |

## Required evidence package

Before the final upload, collect these artifacts:

1. A live master video with voiceover and captions.
2. The completed shot log with unsafe and remediated SHAs.
3. The final evidence artifact digest and workflow URL.
4. A privacy review confirming that no sensitive content appears.
5. A one-page metrics note containing baseline, trial, sample size, and
   measurement window for review time, findings found before merge, explicit
   disposition rate, and stale-SHA rejection.
6. The final slide deck with no placeholders.

## Claims that are allowed

- “AgentProof evaluates configured evidence for this repository, policy, and
  pull-request head SHA.”
- “The gate fails closed for unresolved findings.”
- “A new head SHA invalidates prior evidence and dispositions.”
- “GitHub records remain authoritative; the Evidence Board is mutable.”
- “The permission canary stopped when unsafe mutation capability remained
  visible.”

## Claims that are not allowed

- Universal compliance, legal approval, or regulatory certification.
- Universal security, privacy, or production-suitability certification.
- Verified authorship or universal model provenance.
- Automatic human approval, automatic merge, or an immutable canvas.
- Three live reviewer automations when the supported MVP uses manual launches.

## Final readiness gate

The submission is ready only when every row marked “live proof” has been shown
in the master video, every metric is backed by an actual baseline/trial value,
all placeholders are removed, the privacy review is complete, and the final
voiceover preserves the bounded claims above.
