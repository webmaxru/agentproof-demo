# Evidence contract

AgentProof producers and consumers use a versioned JSON Schema and matching
TypeScript types. The current evidence schema version is `1.0.0`. Runtime
validation is mandatory at every trust boundary. Examples and generated
artifacts are evidence for the identified SHA only.

## Document types

All types share `schemaVersion`, `repository`, `pullRequestNumber`, `baseSha`,
`headSha`, `documentType`, and an `artifact` descriptor.

| `documentType`    | Additional required content                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `raw`             | Generation metadata, origin, tool versions, deterministic findings, diagnostics, reviewer notes, and artifact descriptor.          |
| `final`           | Raw-equivalent facts plus protected policy descriptor, complete disposition history, computed gate, and final artifact descriptor. |
| `review-fragment` | Protected policy digest, source evidence-artifact digest, one SHA-bound reviewer note, and fragment artifact descriptor.           |

Specialist profiles emit only the bounded input to
`createReviewFragment(...)`: shared repository/PR/base/head identity,
policy/evidence digests, one reviewer note, and optional `workflowRunUrl`. They
do not emit `schemaVersion`, `documentType`, or `artifact`. Trusted deterministic
code validates the input, adds those fields and the canonical digest, and
produces `documentType: review-fragment`.

Key final-evidence fields:

| Field                             | Required meaning                                                                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`                   | Explicit supported contract version; unknown versions are rejected.                                                                                             |
| `documentType`                    | `raw`, `final`, or `review-fragment`; consumers do not treat one as another.                                                                                    |
| `repository`, `pullRequestNumber` | Exact GitHub subject.                                                                                                                                           |
| `baseSha`, `headSha`              | Full commit identifiers used for trusted policy and untrusted subject.                                                                                          |
| `generatedAt`, `generatorVersion` | Generation time and AgentProof version.                                                                                                                         |
| `origin`                          | `github-attributed`, `self-declared`, or `unknown`, with bounded source/tool text.                                                                              |
| `policy`                          | Path, version, protected base SHA, and SHA-256 digest.                                                                                                          |
| `tools`                           | Relevant Node, npm, test, audit-data, and collector versions/timestamps.                                                                                        |
| `findings[]`                      | Stable IDs, categories, states, severity, bounded explanation/facts, structured references, exception eligibility, remediation hint, collector, and source SHA. |
| `diagnostics[]`                   | Bounded collector warnings/errors; diagnostics cannot silently become a pass.                                                                                   |
| `dispositions[]`                  | Finding/decision, actor, comment identity/URL/digest, rationale, expiry, recorded time, and bound head SHA.                                                     |
| `reviewerNotes[]`                 | Advisory specialist, visible session link, source SHA, bounded summary, finding IDs, creation time, and fragment digest.                                        |
| `gate`                            | Conclusion, unresolved IDs/counts, evaluation time, and validity horizon.                                                                                       |
| `artifact`                        | Canonical-document SHA-256 and originating workflow-run URL.                                                                                                    |

The checked-in schema and source types are authoritative for exact property
names and constraints. This document explains their security semantics rather
than replacing them.

## Finding semantics

| State       | Positive requirement                                                 | Gate behavior                                                                                     |
| ----------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `pass`      | Valid affirmative evidence meets the protected rule.                 | Does not block.                                                                                   |
| `fail`      | Valid evidence demonstrates a rule violation.                        | Blocks until a new-SHA remediation, unless the base policy explicitly permits exception handling. |
| `unknown`   | Evidence is missing, malformed, stale, unreachable, or inconclusive. | Blocks; tool failure is never pass.                                                               |
| `exception` | A policy-defined condition requires a human disposition.             | Blocks until a current, authorized acceptance is valid.                                           |

`request-remediation`, `reject`, malformed, unauthorized, stale, expired,
edited-away, or deleted decisions remain blocking. Critical and
policy-declared non-exceptionable findings cannot be accepted.

## Stable identity and SHA binding

- A stable finding ID represents the same rule and subject across revisions;
  changed evidence does not invent a new ID merely to lose history.
- Every raw finding identifies the producing collector and PR head SHA.
- A disposition must name the finding and current 40-character head SHA.
- Any new head commit invalidates every prior disposition and evidence result.
- Assembly rejects mixed repository, PR, base policy, head SHA, or schema
  versions.

## Policy binding

Evaluation uses `policy/release-policy.yml` from the protected PR base revision.
The evidence records the policy path, version, base SHA, and digest. A PR cannot
make itself green by weakening the policy it is being evaluated against.

## Canonicalization and integrity

Each raw, final, and trusted review-fragment document is validated,
canonicalized deterministically, and hashed with SHA-256. Consumers recompute
and compare the digest before display or use. This detects mutation after
generation; it is not a digital signature, durable notarization, or proof of
model authorship.

## Raw, final, and advisory evidence

1. **Raw evidence** contains deterministic collector results and metadata for
   one head SHA.
2. **Final evidence** adds protected-policy evaluation, eligible GitHub
   dispositions, gate result, and artifact digest.
3. **Reviewer notes** explain facts but cannot override the deterministic gate.
4. **Canvas state** is a mutable copy/view and may be stale; reload from current
   GitHub evidence before deciding.

Default artifact naming is
`agentproof-raw-pr-<pullRequestNumber>-<headSha>` for analysis and
`agentproof-evidence-pr-<pullRequestNumber>-<headSha>` for final evidence. Raw
and final workflow retention are currently configured for 30 and 90 days
respectively; verify the workflow rather than assuming indefinite availability.

## Consumer checklist

Reject instead of guessing when:

- schema/version validation fails;
- repository, PR, base, head, policy, or workflow metadata does not match;
- the live PR head differs from `headSha`;
- the canonical digest differs;
- a required collector/report is absent;
- a disposition actor, comment, rationale, eligibility, expiry, or SHA is
  invalid; or
- evidence is outside its validity horizon.

No evidence document makes a universal compliance, provenance, security, or
release-suitability claim.

## CLI contract

Run through the root workspace script:

```text
npm run agentproof -- analyze --workspace <path> --metadata <json-file> --output <raw-json>
npm run agentproof -- evaluate --evidence <raw-json> --policy <yml> --dispositions <json> --output <final-json>
npm run agentproof -- assemble --fragments <one-final-json> <review-fragment-json...> --output <assembled-json>
```

`analyze` accepts either trusted PR metadata (including `samplePath`) and runs
bounded Vitest coverage plus `npm audit` itself, or explicit report-source
metadata. `evaluate` always writes valid final evidence when evaluation
completes and exits `0` for a successful gate, `2` for a blocking gate, or `1`
for an input/engine error. `assemble` requires exactly one final evidence
document and at least one review fragment; mixed identity or SHA inputs fail.

For digest calculation, canonicalize the validated JSON with
`artifact.sha256` replaced by 64 zeroes, then calculate SHA-256.

## Origin declaration input

GitHub-provided attribution may produce `github-attributed`. Otherwise, the PR
body supports exactly one bounded self-declaration in either form:

```text
## AI assistance origin

- Classification: self-declared
- Declared tool: Claude-assisted
```

or:

```text
<!-- agentproof-origin:start -->
tool: Claude-assisted
<!-- agentproof-origin:end -->
```

The parsed block is limited to 512 UTF-8 bytes and the tool value to 80
characters. Missing, duplicate, malformed, or oversized input produces
`unknown`; it never establishes universal model provenance.
