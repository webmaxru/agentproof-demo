# Scenario-specific comparison with Claude Code

Historical event framing retained from the upstream prototype, not an
authorship claim about the new reference implementation. Its recording PRs
declare known GitHub Copilot assistance. See [migration provenance](docs/migration.md).

The motivating, anonymized field scenario involved an application built with
Claude assistance whose team then sought independent release validation.
Claude Code and GitHub Copilot can both edit code, use MCP-based tools, and
participate in GitHub workflows; AgentProof does not claim superior code
generation or that Claude cannot implement a comparable workflow.

In the working MVP, PR-triggered GitHub Actions—not model judgment—compute the
SHA-bound `AgentProof / gate`, artifact, and PR summary. A user then manually
starts three isolated, read-only Copilot App reviewer sessions through installed
agents or confirmed deep links and manually runs the Evidence Assembler. Their
advice and mutable canvas stay in one GitHub-centered workspace, while native
GitHub records remain authoritative and a different human still approves.

AgentProof does not claim three live personal reviewer automations. A
2026-09-03 private-lab candidate proved that project selection exposes the
repository reviewers and that opened/synchronized triggers run. It also proved
why the reviewers remain manual: after reducing the picker from 50 tools to 21
read-only GitHub operations, the runtime still exposed `functions.apply_patch`,
`functions.bash`, and broader Actions access. The permission canary stopped,
made no mutation, and was disabled. The Claude-assisted PR is `self-declared`
unless verified platform attribution exists and is governed like
Copilot-assisted, local-model, or human-written code. This is not a universal
provenance, compliance, security, or code-quality claim.
