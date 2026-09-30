import type { FinalEvidence } from "./evidence-schema.js";

function escapeMarkdown(value: string): string {
  return value
    .replaceAll("\r", " ")
    .replaceAll("\n", " ")
    .replace(/[\\|`]/gu, (match) => `\\${match}`);
}

export function renderGateMarkdown(evidence: FinalEvidence): string {
  const icon = evidence.gate.conclusion === "success" ? "✅" : "❌";
  const lines = [
    "<!-- agentproof-gate-summary -->",
    `## ${icon} AgentProof gate: ${evidence.gate.conclusion}`,
    "",
    `**Head:** \`${evidence.headSha}\`  `,
    `**Policy:** \`${evidence.policy.sha256}\`  `,
    `**Evidence:** \`${evidence.artifact.sha256}\``,
    "",
    "| Finding | State | Severity |",
    "|---|---:|---:|",
    ...evidence.findings.map(
      (finding) =>
        `| ${escapeMarkdown(finding.id)} — ${escapeMarkdown(finding.title)} | ${finding.state} | ${finding.severity} |`,
    ),
  ];

  if (evidence.gate.unresolvedFindingIds.length > 0) {
    lines.push(
      "",
      `**Unresolved:** ${evidence.gate.unresolvedFindingIds.map((id) => `\`${id}\``).join(", ")}`,
    );
  }
  if (evidence.gate.validUntil !== null) {
    lines.push("", `**Valid until:** ${evidence.gate.validUntil}`);
  }
  lines.push("", "GitHub checks, comments, reviews, artifacts, and SHAs are authoritative.");
  return `${lines.join("\n")}\n`;
}
