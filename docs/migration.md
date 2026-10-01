# App-first migration and media provenance

This reference implementation belongs only to
[`webmaxru/agentproof-demo`](https://github.com/webmaxru/agentproof-demo).
The upstream product kit and marketplace are
[`webmaxru/AgentProof`](https://github.com/webmaxru/AgentProof).
The import used immutable source commit
`47fdeeb665d930a599a3530958b8e62325647810`, not a concurrently changing checkout.
The source checkout was not modified.

The compatible app-root collector adaptation was imported as an 11-file patch
from the separately reviewed kit migration, now committed upstream as
`c5c96060bc764756ceab788591063ccab861a357`
([webmaxru/AgentProof#1](https://github.com/webmaxru/AgentProof/pull/1), unmerged).
It supplies trusted `APPLICATION_PATH`, backward-compatible `samplePath`,
OS-temporary staging, provider ownership, and root/nested runtime regressions.
This implementation keeps its expense-specific policy/AP-ID together. It does
not merge or approve the upstream PR.

The candidate automatic-refresh repair imports source commit
`8b7f5c5de64a66c24a4d24e928355130757e38f0`, plus the native Publisher-validator
extraction from `95f68dc2e5284348cbb24b7d8391946aa9305b96`. Source workflow
templates were mapped to this application's active `.github/workflows`.
This is a reviewable PR #4 change, not a deployment to protected `main`.
Analysis isolation, application-specific AP-ID, policy, thresholds, action
pins, and dependency manifests remain unchanged.

## Mapping

| Source snapshot                                                      | Reference implementation                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `sample-repo/src`, `tests`, `config`                                 | Root `src`, `tests`, `config`                                                        |
| Sample manifest and TypeScript/Vitest configuration                  | Root app manifest/configuration, integrated with private workspaces                  |
| `packages/evidence-core`, `packages/evidence-cli`                    | Vendored private packages at the same paths                                          |
| `.github/scripts`, `.github/workflows`, `policy`                     | Root-app trusted collection and publication                                          |
| `demo/unsafe-change.patch`                                           | Preserved as `demo/historical-unsafe-change.patch`; not applicable to the new layout |
| `demo/synthetic-findings.json`                                       | Still a synthetic fixture; only app paths adapted                                    |
| `hackathon-2026`, `SUMMARY.md`, `CLAUDE-COMPARISON.md`, `provenance` | Retained event/reference material, not proof of a new run                            |
| Plugin implementation and marketplace descriptor                     | Not duplicated; install from the upstream marketplace                                |

The original MIT license and notice remain. Event-specific provenance describes
the source project as it existed, including plugin work now maintained upstream.
Private package manifests prevent accidental publication.

## Historical observations are not new evidence

The 2026-09-02 Actions/plugin observations and 2026-09-03 permission-canary
observations happened in historical private validation repositories. Their old
identifiers were removed from active prose instead of replacing them with the
new repository name and falsely implying a rerun. The recorded
`UNSAFE_TOOL_BOUNDARY` remains a historical fail-closed observation. No reviewer
automation is enabled by this migration.

Current GitHub commands, runs, head SHAs, policy/artifact digests, settings, and
human-only gaps are recorded separately in [GitHub setup](github-setup.md).
The private-plan APIs returned HTTP 403 on 2026-09-30. On 2026-10-01 the repository
became public and native reads verified active delivery ruleset `24293848` and
protected `main`. Those are separate dated observations; a checked-in ruleset
alone is not enforcement, and the owner's review is still not independent.

## Recording material

The original silent draft, captions, manifest, and ten stills remain under
`hackathon-2026/assets/`. They are **PRECOMPUTED / NOT LIVE** timing references,
not live GitHub or Copilot captures. Do not remove their persistent labels or use
them as evidence of current exceptions, reviews, or protection behavior.

New media is isolated under `hackathon-2026/assets/recording-kit/` with its own
generation and digest manifest. Draft voiceover, captions, and templates are
preparation assets; they are not completed narration, a final live master,
privacy approval, or a human release decision.

The unsafe and remediation branches must remain distinct until the authorized
human records the intended same-PR transition. Agents must not post exception
acceptances, approve, merge, release, invent reviewer output, or fabricate a
privacy sign-off.
