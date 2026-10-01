# Recording checklist

Use this as the final go/no-go sheet. Mark every item before releasing the
video or sharing the draft.

## Live evidence

- [ ] Unsafe pull request is synthetic and disposable.
- [ ] Unsafe head SHA is recorded privately and visible in the take.
- [ ] Red `AgentProof / gate` is complete before reviewer sessions begin.
- [ ] Final/raw evidence links match the repository, PR number, policy, and
      current head SHA.
- [ ] The capture helper uses a clean current protected workflow checkout;
      its orchestration SHA is recorded separately from the immutable PR/policy base.
- [ ] Old-base repair is human-deployed and the formerly failed PR #5/#6 paths
      have completed native publication; PR #10 success alone is not full batch success.
- [ ] Test, Security, and Policy reviewer results are isolated and read-only.
- [ ] Evidence Board authority banner is visible.
- [ ] Exception is eligible, specific, authorized, expiring, and current-SHA.
- [ ] Remediation commit creates a visibly different head SHA.
- [ ] Old evidence, exception, and approval are shown stale or ineffective.
- [ ] Fresh evidence and any fresh reviewer fragments match the new SHA.
- [ ] Final artifact digest is visible and matches the final evidence.
- [ ] Independent reviewer is not the author or release decision-maker.
- [ ] Merge is shown as available but is not clicked.
- [ ] Permission canary remains disabled after `UNSAFE_TOOL_BOUNDARY`.

## Privacy

- [ ] No secrets, tokens, password managers, environment variables, or
      authentication prompts appear.
- [ ] No customer data, tenant links, customer repository names, or personal
      email/chat/calendar content appears.
- [ ] No browser notifications, unrelated tabs, avatars, bookmarks, or
      account identifiers appear.
- [ ] All synthetic screenshots and fallback clips carry
      `PRECOMPUTED / NOT LIVE` for their full duration.
- [ ] The voiceover does not use legal, compliance, provenance, or universal
      security language.

## Technical export

- [ ] 16:9 output at 1920x1080 or 1280x720.
- [ ] 30 fps, readable cursor, and no dropped frames.
- [ ] Runtime is at most 2:54.
- [ ] Captions match the final narration.
- [ ] Voiceover is intelligible over UI audio.
- [ ] Full SHA and check name remain readable on a normal laptop screen.
- [ ] Final MP4 plays from start to finish after export.
- [ ] Shot log and privacy review are stored beside the draft/master.
