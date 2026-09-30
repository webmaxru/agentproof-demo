# Architecture

## Goal and trust statement

AgentProof proves a bounded statement: for one repository, policy version, and
pull-request head SHA, configured deterministic evidence was evaluated and an
explicit human decision plus independent review governed merge.

It does **not** prove universal authorship, security, privacy, legal compliance,
or production fitness.

## Components

| Layer                    | Component                                                 | Responsibility                                                                                                                              |
| ------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Subject                  | Synthetic expense API and PR                              | Untrusted code and declared origin under review.                                                                                            |
| Collection               | `@agentproof/evidence-cli` collectors                     | Run tests/coverage, dependency audit, retention validation, and origin parsing; normalize failures as findings.                             |
| Contract                 | `@agentproof/evidence-core`                               | Validate evidence and policy, canonicalize JSON, calculate digests, authorize dispositions, and compute the gate.                           |
| Analysis workflow        | `agentproof-analyze.yml`                                  | Use protected workflow bootstrap, read-only GitHub access, no secrets, and an ephemeral runner to create raw head-SHA evidence.             |
| Publisher                | `agentproof-publish.yml`                                  | Run trusted base code, validate provenance and live SHA, apply protected-base policy, publish the check/comment, and retain final evidence. |
| Disposition/revalidation | `agentproof-disposition.yml`, `agentproof-revalidate.yml` | Re-evaluate on decision changes and periodically so deleted or expired acceptance cannot leave a stale green result.                        |
| App reviewers            | Test, Security, Policy                                    | User starts three isolated, read-only sessions after the check; they return same-SHA advisory fragments and cannot write to GitHub.         |
| Assembler and canvas     | Evidence Assembler, Evidence Board                        | User runs assembly manually to reject mixed-SHA inputs and load a mutable operational view and decision draft.                              |
| Permission canary        | Disposable personal PR automation                         | Inspects the effective runtime tool boundary, stops before tool use on mutation capability, and is disabled after a failed validation.      |
| Governance               | GitHub ruleset, CODEOWNERS, independent review            | Require the stable check and a separate human approval before merge.                                                                        |

## Data flow

```mermaid
flowchart LR
  PR[Untrusted PR head] -->|PR event; read-only, no secrets| A[Analysis workflow]
  BP[Protected base policy and evaluator] --> A
  A -->|raw evidence + metadata| AR[Actions artifact]
  AR --> P[Trusted publisher]
  BP --> P
  GH[Live GitHub PR/head/comments] --> P
  P --> C[AgentProof / gate]
  P --> F[Final evidence artifact]
  C --> R[Repository ruleset]
  F -->|user-confirmed manual launch| S[Three isolated read-only specialist sessions]
  S --> E[Manual Evidence Assembler]
  E --> B[Evidence Board: mutable]
  H[Authorized PR disposition] --> D[Disposition workflow]
  D --> A
  I[Independent reviewer approval] --> R
  R --> M[Merge available]
```

## Security-sensitive workflow split

1. **Analyze:** may execute PR-controlled application/test code, but receives no
   secrets and only read access. It cannot publish a check or comment.
2. **Publish:** has check/comment write capability, but executes trusted
   base/default-branch code only. It validates the incoming workflow,
   repository, PR, schema, artifact metadata, policy base SHA, and current head
   SHA before writing.
3. **Disposition:** never executes PR code. It authorizes the actor and command,
   then dispatches a fresh analysis rather than trusting a canvas draft.
4. **Revalidate:** periodically dispatches fresh evidence for open PRs so
   expiry/deletion cannot preserve an obsolete decision indefinitely.

Reviewer sessions are outside this write-capable workflow path. A user starts
each installed agent or reviewed deep link only after the deterministic result
exists, confirms a read-only tool set, and later invokes the assembler manually.
If the App cannot safely reduce an **All tools** default, the launch is canceled.

The private-lab permission canary tested the host rather than trusting profile
frontmatter. The picker was reduced from 50 tools to 21 read/list/search/get
operations, but the resulting automation still reported
`functions.apply_patch`, `functions.bash`, and Actions access beyond the source
repository. It returned `UNSAFE_TOOL_BOUNDARY` before tool use and was disabled.
The canary is not connected to the deterministic gate.

The workflows use concurrency controls so an obsolete analysis cannot
intentionally overwrite a newer revision. GitHub Actions artifacts have finite
retention and are evidence records, not permanent archives.

## Authority and consistency

- Repository, PR number, base SHA, head SHA, policy digest, collector identity,
  and artifact digest must agree.
- A head-SHA change invalidates previous evidence and dispositions.
- Specialist prose is advisory. A collector failure becomes `unknown`.
- The Evidence Board can be edited or cleared and is never authoritative.
- GitHub commits, checks, native PR comments/reviews, and SHA-bound artifacts
  are the system of record.

## Deployment boundary

The MVP is one private GitHub.com repository with synthetic data. GitHub Actions
are PR-triggered; the three reviewer sessions and Evidence Assembler are manual.
Checked-in automation prompts are blocked setup/product-feedback templates, not
live personal reviewer automations or automation-as-code. Cross-repository
portfolio orchestration, automatic merge/release, and a locked audit store are
out of scope.

Historical upstream validation on 2026-09-02 produced the SHA-bound
check, artifact, and PR summary in a different private repository, with a direct
plugin installation. Its private identifier is omitted; this is not new live
evidence for `webmaxru/agentproof-demo`. On 2026-09-03, repository profiles on the
private automation lab's default branch appeared after project selection and a
disposable opened/synchronized automation ran. Effective runtime validation
still exposed mutation-capable built-ins, so no reviewer automation was
accepted and the candidate was disabled.

The app-first implementation places the synthetic API in `src/`, its tests in
`tests/`, and retention configuration in `config/`. Private engine and CLI
workspaces live in `packages/`; the plugin is installed separately from the
`webmaxru/AgentProof` marketplace. Current repository settings and entitlement
limitations are recorded in [GitHub setup](github-setup.md).
