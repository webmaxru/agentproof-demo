# Synthetic recording scenarios

`unsafe-change.patch` targets this app-root repository. Apply it only on a
disposable recording branch, then regenerate and commit the root lockfile with
`npm install --package-lock-only --ignore-scripts`. It pins Fastify 5.8.4,
removes only the stable AP-ID marker (not the passing authorization behavior or
assertions), and removes `deletionMethod`. Current npm audit results, not this
patch or a fixture, determine the actual dependency finding.

Keep the unsafe recording PR frozen at that head until the human captures its
first eligible exception. For the later authorized recording transition,
restore the reviewed patched runtime (currently Fastify 5.12.5) and the marker
while retaining incomplete retention. Incorporate the then-current reviewed
main dependency/lock fix and controls, then obtain fresh evidence for the
resulting full SHA. Existing prepared PR #6 stays frozen: its Fastify 5.12.1
resolution is now affected by high advisories, so its older retention-only
receipt is historical, not a current passing remediation. Do not post
exceptions, approve, merge, or release as an agent.

`synthetic-findings.json` is **PRECOMPUTED / NOT LIVE**, with app-root paths
adapted for illustration. It is not a scan of either recording head.
`historical-unsafe-change.patch` preserves the original nested-app patch from
upstream commit `47fdeeb665d930a599a3530958b8e62325647810`; it is not applicable
to this layout.
