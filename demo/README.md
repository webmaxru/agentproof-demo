# Synthetic recording scenarios

## Current prepared subjects (2026-10-01)

| Role                                      | Native PR                                                  | Full head SHA                              | Use                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Frozen unsafe scenario                    | [#5](https://github.com/webmaxru/agentproof-demo/pull/5)   | `e445241ec7a8cd913eeb50b0798c03d46816b629` | Dependency fail, missing authorization marker fail, retention unknown; preserve this head.                 |
| Current prepared retention-only successor | [#12](https://github.com/webmaxru/agentproof-demo/pull/12) | `9a0cb79cfc19b30bc32b858ddf8e4058a5367251` | Separate draft from protected main; only `deletionMethod` is removed.                                      |
| Historical prepared remediation           | [#6](https://github.com/webmaxru/agentproof-demo/pull/6)   | `830d2589cee7ab9b2db4b3afa1c93f25ca2b6c73` | Preserve the old head and receipts; Fastify 5.12.1 no longer provides current passing dependency evidence. |

PR #12's base and preparation-time protected workflow revision are both
`66058035adc0ca613f4d1fa5db6afc606327b7c0`. It retains that revision's Fastify
5.12.5 manifest/lockfile, passing authorization behavior and stable AP-ID, both
code owners, and all policy/workflow controls. Its initial native evidence at
`2026-10-01T20:27:31.214Z` has 5 pass, 0 fail, 1 unknown, and 0 exception,
blocked only by `AP-POL-RETENTION-001`. That is a dated receipt, not a promise
about future advisories or current state; the actual native evidence determines
the result, not this description or a fixture.

Before each take, resolve the live PR/base/full head and newest completed
native check/artifact using the
[trusted capture procedure](../hackathon-2026/assets/recording-kit/README.md#refresh-presenter-evidence-before-recording).
Do not pin a previous artifact digest as permanently current. The
[setup record](../docs/github-setup.md) separates dated receipts from current
capture requirements. Keep PR #5 and PR #6 unchanged during preparation.

**A separate successor is not the same-PR lifecycle demo.** PR #12 does not
advance PR #5, invalidate a PR #5 disposition, or demonstrate stale approval.
The authorized human must record that later transition on the same PR, after
its first eligible disposition. Incorporate the then-current protected main,
preserving its owners, controls, and reviewed dependency/lock fixes; resolve
the resulting full head/base and collect fresh evidence. No prepared head is
automatically that future head. Draft-disabled Merge is not an enforcement
test. Agents must not post exceptions, approve, merge, or release.

## Reproduce the unsafe scenario

`unsafe-change.patch` targets this app-root repository. Apply it only on a
disposable recording branch, then regenerate and commit the root lockfile with
`npm install --package-lock-only --ignore-scripts`. It pins Fastify 5.8.4,
removes only the stable AP-ID marker (not the passing authorization behavior or
assertions), and removes `deletionMethod`. Current npm audit results, not this
patch or a fixture, determine the actual dependency finding.

For the later authorized remediation, select a currently patched runtime,
refresh the lockfile, restore the marker while retaining incomplete retention,
and rerun the trusted production audit. Do not assume a version remains patched
because a historical receipt passed.

## UI-only synthetic fallback

`synthetic-findings.json` is **PRECOMPUTED / NOT LIVE**, with app-root paths
adapted for illustration. Its fake repository, all-zero base, all-one head,
historical timestamp, and null workflow URL deliberately do not identify any
recording PR. The normal test pipeline checks its canonical digest, synthetic
identity, and two-fail/one-unknown blocking state. It is not a current scan;
follow the [fallback rules](../hackathon-2026/fallback/README.md).

`historical-unsafe-change.patch` preserves the original nested-app patch from
upstream commit `47fdeeb665d930a599a3530958b8e62325647810`; it is not applicable
to this layout.
