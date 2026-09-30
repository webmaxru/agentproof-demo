# Starting assets and provenance

Record date: 2026-09-02.

Historical upstream record preserved during the app-first migration from
`webmaxru/AgentProof` commit `47fdeeb665d930a599a3530958b8e62325647810`.
References to plugin implementation and original illustrative origin values
describe that source snapshot, not new live validation or the new PRs'
authorship. Current mapping and recording media are documented in
[migration provenance](../docs/migration.md).

## Starting point

AgentProof began as a greenfield repository for the FY27 GitHub Copilot App
Enterprise Challenge. No customer repository, application source, policy,
configuration, prompt, or production dataset was used.

An approved internal implementation plan and an internal challenge research
pack supplied the problem framing, rubric interpretation, anonymized evidence
counts, verified product boundaries, and original AgentProof concept. The pack
intentionally excludes raw customer quotes, names, emails, meeting identifiers,
tenant URLs, and source links. Those private materials are not redistributed
here.

## Original AgentProof additions

Unless a later row says otherwise, repository code, synthetic sample data,
policy/schema, workflows/scripts, agent and skill instructions, automation
prompts, evidence fixtures, documentation, diagrams, templates, demo patch,
storyboard, and slide outline were authored for this prototype and are covered
by the repository's MIT license.

The expense-approval scenario, identities, findings, and retention declaration
are wholly synthetic. The `Claude-assisted` field is a self-declared demo value,
not verified model provenance and not customer evidence.

## Generated or adapted scaffolds

| Asset                    | Starting source                                                                     | Adaptation                                                                                                                                             | License/provenance action                                                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Evidence Board extension | Original project code informed by the current GitHub canvas-extension documentation | Implemented under `plugin/extensions/evidence-board` with an isolated host adapter, AgentProof evidence contract, reducer, UI, capabilities, and tests | No third-party scaffold source was copied. The implementation is covered by the repository MIT license; revalidate the host API before release because the surface can change. |
| npm lockfile             | npm from the declared workspace manifests                                           | Deterministic dependency resolution; no hand-copied source                                                                                             | Exact package versions and license review belong in `dependency-licenses.md`.                                                                                                  |
| GitHub Actions workflows | Original workflow design using documented GitHub Actions syntax                     | Four-way trust split, SHA validation, and AgentProof scripts                                                                                           | Third-party actions are referenced by reviewed full commit SHA; action licenses must be checked with their source repositories before release.                                 |

If a generator adds a copyright or license header, preserve it and update this
record and `NOTICE`; do not assume the repository license replaces it.

## Research and product references

Factual capability/setup statements were grounded in the research pack's
2026-09-01 review of official GitHub documentation, including:

- [GitHub Copilot App](https://docs.github.com/en/copilot/how-tos/github-copilot-app)
- [Agent sessions](https://docs.github.com/en/copilot/how-tos/github-copilot-app/agent-sessions)
- [Customize the App](https://docs.github.com/en/copilot/how-tos/github-copilot-app/customize-github-copilot-app)
- [Canvas extensions](https://docs.github.com/en/copilot/how-tos/github-copilot-app/working-with-canvas-extensions)
- [Automations](https://docs.github.com/en/copilot/how-tos/github-copilot-app/using-automations)
- [Plugins](https://docs.github.com/en/copilot/concepts/agents/about-plugins)
- [Enterprise-managed settings](https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-enterprise/manage-agents/configure-enterprise-managed-settings)
- [Deep links](https://docs.github.com/en/copilot/how-tos/github-copilot-app/open-with-deep-links)

Documentation links are references, not copied code. Product behavior changes;
revalidate it before recording or customer use.

## Media and trademarks

No third-party logo, customer screenshot, customer quote, or external media
asset is included as of this record date. GitHub and product names are used
factually; trademarks remain with their owners.

Before adding competition screenshots or video:

1. use only the synthetic AgentProof repository;
2. redact unrelated account, tenant, notification, and repository details;
3. record file/source/date/authorization/redactions in the fallback capture
   manifest;
4. label precomputed content continuously; and
5. update this file and `NOTICE` for any third-party asset or required
   attribution.

## Contributor and tool disclosure

Preserve normal Git history and any required co-author/tool attribution. Tool
assistance does not establish universal authorship provenance; this record
documents known starting inputs and reuse obligations only.
