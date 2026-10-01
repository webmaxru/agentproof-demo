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
([webmaxru/AgentProof#1](https://github.com/webmaxru/AgentProof/pull/1)).
It supplies trusted `APPLICATION_PATH`, backward-compatible `samplePath`,
OS-temporary staging, provider ownership, and root/nested runtime regressions.
This implementation keeps its expense-specific policy/AP-ID together. It does
not merge or approve the upstream PR.

The original automatic-refresh repair imported source commit
`8b7f5c5de64a66c24a4d24e928355130757e38f0`, plus the native Publisher-validator
extraction from `95f68dc2e5284348cbb24b7d8391946aa9305b96`. Source workflow
templates were mapped to this application's active `.github/workflows`.
That repair landed through reference PR #4 at protected main
`28f185f710848cf20a2c4c047f5499583c7fdcb2`. PR #10's native metadata refresh
succeeded, but the subsequent batch failed for older-base PR #5/#6; see the
separate step 5/step 6 receipts in [GitHub setup](github-setup.md).

The subsequent old-base repair imports immutable source commit
`a7bd2c29cbe77f4930ee216296205dda110766a6`
([webmaxru/AgentProof#4](https://github.com/webmaxru/AgentProof/pull/4)).
Its consumer runtime patch SHA-256 is
`c4d1e4269981d6ad11a975044223b41c56d7945b20fa03f0681a2fd631bd80d6`.
Six shared scripts and four workflow templates are mapped to the active
consumer paths; shared workflow/CLI regressions come from the same commit.
The reference keeps `APPLICATION_PATH = "."`, its presenter regressions, and
its expense-specific policy/AP-ID. Analysis isolation, policy thresholds,
action pins, both CODEOWNERS, runtime dependencies, and protections are unchanged.

This follow-up separates the independently verified current protected workflow
revision from the immutable PR policy/evidence base. Current bootstrap
publication validators cannot be replaced by older policy-base publication
scripts. The presenter uses those current native-only validators, but fetches
the subject's policy at its real base. Candidate tests and native CI alone
were not deployment evidence. The human merge of reference PR #11 subsequently
installed the repair on protected main
`66058035adc0ca613f4d1fa5db6afc606327b7c0`; native metadata/manual-batch
publication, including the unchanged old-base subjects, is recorded in
[GitHub setup](github-setup.md). Issue #7 is closed. Uninterrupted
scheduler-only and human lifecycle demonstrations remain separate work.

## Mapping

| Source snapshot                                                      | Reference implementation                                                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `sample-repo/src`, `tests`, `config`                                 | Root `src`, `tests`, `config`                                                                                       |
| Sample manifest and TypeScript/Vitest configuration                  | Root app manifest/configuration, integrated with private workspaces                                                 |
| `packages/evidence-core`, `packages/evidence-cli`                    | Vendored private packages at the same paths                                                                         |
| `.github/scripts`, `.github/workflows`, `policy`                     | Root-app trusted collection and publication                                                                         |
| `demo/unsafe-change.patch`                                           | Preserved as `demo/historical-unsafe-change.patch`; not applicable to the new layout                                |
| `demo/synthetic-findings.json`                                       | Synthetic identity retained; app paths adapted, canonical digest repaired, durable audit remediation guidance added |
| `hackathon-2026`, `SUMMARY.md`, `CLAUDE-COMPARISON.md`, `provenance` | Retained event/reference material, not proof of a new run                                                           |
| Plugin implementation and marketplace descriptor                     | Not duplicated; install from the upstream marketplace                                                               |

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
