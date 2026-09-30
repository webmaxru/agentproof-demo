# AgentProof recording kit

These are **precomputed production aids, not live evidence**. They contain no
real reviewer output, accepted exception, PR approval, or privacy sign-off.
The repository's recording guide and live GitHub records remain authoritative.

| Asset                                   | Use                                                                                                            |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `agentproof-recording-deck.pptx`        | Three editable 16:9 slides: trust gap, control loop, honest boundaries. Speaker notes explain allowed claims.  |
| `agentproof-voiceover-draft.srt`        | Sentence-level draft captions for the 2:54 script. Re-time and edit them after recording the actual voiceover. |
| `timeline.json`                         | Ten shot intervals, expected pictures, voiceover, and human-action boundaries.                                 |
| `cue-cards`                             | Ten 1920x1080 cue cards, each permanently labeled `PRECOMPUTED / NOT LIVE`.                                    |
| `overlays`                              | Ten transparent 1920x1080 lower-thirds and a persistent fallback banner.                                       |
| `agentproof-cue-timing-draft.mp4`       | Optional silent 2:54 / 30 fps timing reference, permanently labeled. Never submit as the live master.          |
| `agentproof-shot-log.template.md`       | Actual-take log to complete after recording.                                                                   |
| `agentproof-privacy-review.template.md` | Uncompleted privacy and final-export review.                                                                   |
| `asset-manifest.json`                   | Generated-file SHA-256 digests and mechanical media metadata, not signed attestations.                         |
| `generate_assets.py`                    | Reproducible generator and structural/media checks.                                                            |
| `capture-state.mjs`                     | Read-only current-PR evidence capture and intentionally incomplete human-decision skeletons.                   |

## Rebuild

Use Python 3.10+ with Pillow and python-pptx, plus ffmpeg/ffprobe on PATH for
video generation. No network access or GitHub token is used by the generator.

```powershell
python .\generate_assets.py --video
python .\generate_assets.py --verify-only
```

The deck uses Segoe UI; image generation can fall back to DejaVu Sans.
`--verify-only` checks structure, slide bounds, dimensions, the permanent
cue-card banner, duration/frame rate when the video exists, and file digests.
It does not replace visual review or prove the live GitHub story.
Text assets use LF line endings, matching `.gitattributes`, so their manifest
digests survive commits and fresh checkouts on Windows as well as Linux.

## Refresh presenter evidence before recording

From this directory in the reference repository, after its trusted local
toolchain has been built, use a clean checkout of the current PR **base SHA**,
not the untrusted PR head. The helper verifies the checkout identity and rejects
modified evaluator, policy, or workflow-script sources before importing code:

```powershell
node .\capture-state.mjs --pr <PR_NUMBER>
```

The helper uses the saved `webmaxru` GitHub keyring identity, removing inherited
`GH_TOKEN` and `GITHUB_TOKEN` only in its subprocess environment. It never
changes the global login, posts a comment, submits a decision, starts a workflow,
approves, or merges. It rejects stale/mixed identity, incomplete checks, expired
artifacts, mismatched canonical digests, and incorrect protected-base policy.
GitHub can replace a custom check's `details_url` with its native check page.
The helper therefore reads the single publisher link from the native check's
summary, then independently verifies that run, its artifact, and the protected
policy. A native check-page ID is never treated as a workflow-run ID.
The completed publisher must agree with the native gate: a `failure` is expected
for genuine blocking evidence and is never relabeled as a passing workflow.

If the reviewed capture fix is still in the unmerged setup PR, use a clean,
disposable checkout of the live PR base and copy only that reviewed commit's
recording kit into it. From the repository root, after fetching that commit:

```powershell
git restore --source "<REVIEWED_KIT_COMMIT_SHA>" --worktree -- .\hackathon-2026\assets\recording-kit
```

Keep the evaluator, policy, package files, and workflow scripts at the base
revision. Do not run the capture from the candidate PR head. This local asset
overlay does not merge the PR, change `main`, or turn the snapshot into approval.

Every successful capture gets a new ignored `.agentproof\recording` directory.
The downloaded evidence and `presenter-state.json` are a private, read-only
snapshot, not a lasting approval. The separate human-decision skeleton has
deliberately invalid reason/expiry placeholders. A human must recheck the live
SHA, comments, permission, finding eligibility, and date before submission.
Do not commit these private presenter outputs or record unrelated metadata.

## Editing and truth rules

Begin the live video on the actual unsafe PR, not a title slide. Keep the
original script's timeboxes and finish by 2:54. Use the limits slide in the
2:32-2:43 segment. Lower-thirds are for live UI shots, not the already labeled
slides; otherwise they can obscure the stale-evidence callout and disclaimers.
Overlays must not conceal the full SHA or check name.

The caption draft follows the intended script, **not a claim that every take
has already happened**. Before picture lock:

- The source's final 11-second segment has 30 words and needs a faster delivery
  than the guide's general 130-150 wpm target. Shorten the actual take or
  rebalance pauses without exceeding 2:54, then update the captions.
- Omit specialist-result shots unless real, current-SHA, read-only results exist.
- Use the "fresh specialist notes" sentence only when such notes actually exist.
- Show stale approval only if an actual prior human approval was dismissed.
- Do not show merge availability or say checks cannot be bypassed until the
  repository has enforceable rules and an actual distinct human approval.
- Use the final "we tested" canary narration only with an actual recorded result
  and a verified disabled trigger. Otherwise say: "Reviewer automation remains
  blocked. The runtime must expose only the approved read tools before a
  reviewer can run." Show this as a limitation, not a new successful canary.
- Keep `PRECOMPUTED / NOT LIVE` visible for the full duration of every fallback.

Do not create `agentproof-live-master.mp4` by renaming the timing draft.
The presenter must record real GitHub/App footage and voiceover. Copy the
shot-log and privacy templates only when completing those actual reviews.
