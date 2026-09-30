# Demo fallback assets — PRECOMPUTED / NOT LIVE

Everything shown from this folder or `../../demo/synthetic-findings.json` is a
continuity aid and must be labeled:

```text
PRECOMPUTED / NOT LIVE — SYNTHETIC AGENTPROOF DEMO
```

Keep that label visible for the full frame/clip, and say which surface failed.
Fallback evidence must never be presented as a live scanner, automation,
GitHub approval, immutable canvas record, or current compliance result.

## Allowed fallback sources

1. **Preferred:** a screen capture of an earlier real AgentProof run, retaining
   its real repository/PR/SHA/check context after redaction.
2. **Secondary:** the wholly synthetic `../../demo/synthetic-findings.json` fixture
   loaded into Evidence Board to demonstrate UI behavior only.
3. **Last resort:** static redacted screenshots showing the intended navigation
   with an explanatory caption.

Do not create plausible-looking GitHub checks, comments, reviews, session links,
artifact digests, or SHAs that never existed.

## Capture manifest

For each fallback file added here, record:

| File | Label | Source type | Repository/PR | Head SHA | Captured UTC | Redactions | Intended segment |
|---|---|---|---|---|---|---|---|
| `<FILE>` | `PRECOMPUTED / NOT LIVE` | `<prior-real-run|synthetic-fixture|static-guide>` | `<SYNTHETIC_REFERENCE>` | `<FULL_SHA_OR_N/A>` | `<RFC3339>` | `<NONE_OR_LIST>` | `<TIME_RANGE>` |

Store no customer identifiers, tenant URLs, notifications, emails, secrets, or
unrelated code. Document any third-party logo/screenshot authorization in
`provenance/starting-assets.md`.

## Switch criteria

Use fallback only when:

- a personal automation/App session does not start or load;
- canvas/plugin caching prevents a timely live view;
- npm advisory or GitHub service availability blocks collection; or
- a real workflow cannot complete inside the planned segment.

Do not use fallback to hide a product behavior or security-control failure. If
the authoritative gate/ruleset is wrong, stop and repair the demo.

## Safe transition

Narrate: “This labeled view is a precomputed synthetic continuity asset. The
authoritative result remains the GitHub check, review, commit, and retained
artifact for the SHA shown.” Return to live GitHub state within the next
segment. Never combine fallback evidence from one SHA with a live decision for
another SHA.
