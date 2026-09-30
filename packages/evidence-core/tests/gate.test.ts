import { describe, expect, it } from "vitest";

import { FINDING_IDS, ZERO_SHA256, renderGateMarkdown } from "../src/index.js";
import {
  HEAD_SHA,
  OTHER_SHA,
  evaluateFixture,
  rawEvidenceFixture,
  resign,
  validAcceptance,
} from "./helpers.js";

describe("fail-closed gate evaluation", () => {
  it("passes only with positive evidence for every protected rule", () => {
    const evidence = evaluateFixture(rawEvidenceFixture());
    expect(evidence.gate.conclusion).toBe("success");
    expect(evidence.gate.unresolvedFindingIds).toEqual([]);
    expect(evidence.gate.counts).toEqual({
      pass: 6,
      fail: 0,
      unknown: 0,
      exception: 0,
    });
    expect(evidence.artifact.sha256).not.toBe(ZERO_SHA256);
    expect(renderGateMarkdown(evidence)).toContain("<!-- agentproof-gate-summary -->");
  });

  it("blocks a dependency failure", () => {
    const raw = resign(rawEvidenceFixture(), (draft) => {
      const audit = draft.findings.find((finding) => finding.id === FINDING_IDS.npmAudit);
      if (audit !== undefined) {
        audit.state = "fail";
        audit.facts.highestSeverity = "high";
        audit.facts.total = 1;
        audit.facts.severityCounts = {
          info: 0,
          low: 0,
          moderate: 0,
          high: 1,
          critical: 0,
        };
      }
    });
    const evidence = evaluateFixture(raw);
    expect(evidence.gate.conclusion).toBe("failure");
    expect(evidence.gate.unresolvedFindingIds).toContain(FINDING_IDS.npmAudit);
  });

  it("cannot accept a protected non-exceptionable failure", () => {
    const raw = resign(rawEvidenceFixture(), (draft) => {
      const audit = draft.findings.find((finding) => finding.id === FINDING_IDS.npmAudit);
      if (audit !== undefined) {
        audit.state = "fail";
        audit.facts.highestSeverity = "high";
        audit.facts.total = 1;
        audit.facts.severityCounts = {
          info: 0,
          low: 0,
          moderate: 0,
          high: 1,
          critical: 0,
        };
      }
    });
    const comment = validAcceptance({
      body: validAcceptance().body.replace(FINDING_IDS.dataRetention, FINDING_IDS.npmAudit),
    });
    const evidence = evaluateFixture(raw, [comment]);
    expect(evidence.gate.conclusion).toBe("failure");
    expect(evidence.dispositions[0]?.status).toBe("ineligible");
  });

  it("blocks unknown retention evidence", () => {
    const raw = resign(rawEvidenceFixture(), (draft) => {
      const retention = draft.findings.find((finding) => finding.id === FINDING_IDS.dataRetention);
      if (retention !== undefined) {
        retention.state = "unknown";
        retention.facts.declaration = {
          schemaVersion: "1.0.0",
          classification: "synthetic",
          retentionDays: 30,
        };
      }
    });
    expect(evaluateFixture(raw).gate.unresolvedFindingIds).toContain(FINDING_IDS.dataRetention);
  });

  it("resolves an exceptionable unknown with an authorized current acceptance", () => {
    const raw = resign(rawEvidenceFixture(), (draft) => {
      const retention = draft.findings.find((finding) => finding.id === FINDING_IDS.dataRetention);
      if (retention !== undefined) {
        retention.state = "unknown";
        retention.facts.declaration = {
          schemaVersion: "1.0.0",
          classification: "synthetic",
          retentionDays: 30,
        };
      }
    });
    const evidence = evaluateFixture(raw, [validAcceptance()]);
    expect(evidence.gate.conclusion).toBe("success");
    expect(
      evidence.findings.find((finding) => finding.id === FINDING_IDS.dataRetention)?.state,
    ).toBe("exception");
    expect(evidence.dispositions[0]?.status).toBe("accepted");
    expect(evidence.gate.validUntil).toBe("2026-09-20T23:59:59.999Z");
  });

  it("keeps complete history while only the latest valid disposition is effective", () => {
    const raw = resign(rawEvidenceFixture(), (draft) => {
      const retention = draft.findings.find((finding) => finding.id === FINDING_IDS.dataRetention);
      if (retention !== undefined) {
        retention.state = "unknown";
        retention.facts.declaration = {};
      }
    });
    const acceptance = validAcceptance({ commentId: "100" });
    const remediation = validAcceptance({
      commentId: "101",
      body: `/agentproof request-remediation ${FINDING_IDS.dataRetention}
sha: ${HEAD_SHA}
reason: Complete the protected retention declaration before release.`,
      recordedAt: "2026-09-02T08:25:00.000Z",
    });
    const evidence = evaluateFixture(raw, [remediation, acceptance]);
    expect(evidence.dispositions.map(({ status, effective }) => ({ status, effective }))).toEqual([
      { status: "superseded", effective: false },
      { status: "remediation-requested", effective: true },
    ]);
    expect(evidence.gate.conclusion).toBe("failure");
    expect(evidence.gate.unresolvedFindingIds).toContain(FINDING_IDS.dataRetention);
  });

  it("does not apply a stale SHA disposition", () => {
    const raw = resign(rawEvidenceFixture(), (draft) => {
      const retention = draft.findings.find((finding) => finding.id === FINDING_IDS.dataRetention);
      if (retention !== undefined) {
        retention.state = "unknown";
        retention.facts.declaration = {};
      }
    });
    const comment = validAcceptance({
      body: validAcceptance().body.replace(HEAD_SHA, OTHER_SHA),
    });
    const evidence = evaluateFixture(raw, [comment]);
    expect(evidence.gate.conclusion).toBe("failure");
    expect(evidence.dispositions[0]?.status).toBe("stale");
  });

  it("does not apply an expired exception", () => {
    const raw = resign(rawEvidenceFixture(), (draft) => {
      const retention = draft.findings.find((finding) => finding.id === FINDING_IDS.dataRetention);
      if (retention !== undefined) {
        retention.state = "unknown";
        retention.facts.declaration = {};
      }
    });
    const comment = validAcceptance({
      body: validAcceptance().body.replace("2026-09-20", "2026-09-01"),
    });
    const evidence = evaluateFixture(raw, [comment]);
    expect(evidence.gate.conclusion).toBe("failure");
    expect(evidence.dispositions[0]?.status).toBe("expired");
  });

  it("does not apply an unauthorized actor disposition", () => {
    const raw = resign(rawEvidenceFixture(), (draft) => {
      const retention = draft.findings.find((finding) => finding.id === FINDING_IDS.dataRetention);
      if (retention !== undefined) {
        retention.state = "unknown";
        retention.facts.declaration = {};
      }
    });
    const evidence = evaluateFixture(raw, [validAcceptance({ actorPermission: "read" })]);
    expect(evidence.gate.conclusion).toBe("failure");
    expect(evidence.dispositions[0]?.status).toBe("unauthorized");
  });

  it.each(["edited-away", "deleted"] as const)(
    "does not apply a disposition whose comment is %s",
    (sourceState) => {
      const raw = resign(rawEvidenceFixture(), (draft) => {
        const retention = draft.findings.find(
          (finding) => finding.id === FINDING_IDS.dataRetention,
        );
        if (retention !== undefined) {
          retention.state = "unknown";
          retention.facts.declaration = {};
        }
      });
      const evidence = evaluateFixture(raw, [validAcceptance({ sourceState })]);
      expect(evidence.gate.conclusion).toBe("failure");
      expect(evidence.dispositions[0]?.status).toBe(sourceState);
    },
  );

  it("blocks explicit collector errors", () => {
    const raw = resign(rawEvidenceFixture(), (draft) => {
      const suite = draft.findings.find((finding) => finding.id === FINDING_IDS.testSuite);
      if (suite !== undefined) {
        suite.state = "unknown";
        suite.summary = "Vitest tool failed.";
        suite.facts = {};
      }
      draft.diagnostics.push({
        collector: "vitest",
        level: "error",
        code: "AP_VITEST_TOOL_ERROR",
        message: "Vitest exited unexpectedly.",
      });
    });
    const evidence = evaluateFixture(raw);
    expect(evidence.gate.conclusion).toBe("failure");
    expect(evidence.gate.unresolvedFindingIds).toContain(FINDING_IDS.testSuite);
  });

  it("blocks an error diagnostic that contradicts passing findings", () => {
    const raw = resign(rawEvidenceFixture(), (draft) => {
      draft.diagnostics.push({
        collector: "vitest",
        level: "error",
        code: "AP_VITEST_TOOL_ERROR",
        message: "Contradictory collector error.",
      });
    });
    const evidence = evaluateFixture(raw);
    expect(evidence.gate.unresolvedFindingIds).toContain(FINDING_IDS.collectorIntegrity);
  });

  it("does not upgrade untrustworthy provenance when an origin value is present", () => {
    const raw = resign(rawEvidenceFixture(), (draft) => {
      const origin = draft.findings.find((finding) => finding.id === FINDING_IDS.origin);
      if (origin !== undefined) {
        origin.state = "unknown";
        origin.summary = "Origin collector failed after parsing metadata.";
      }
      draft.diagnostics.push({
        collector: "origin",
        level: "error",
        code: "AP_ORIGIN_METADATA_INVALID",
        message: "Origin collector did not produce trustworthy evidence.",
      });
    });
    const evidence = evaluateFixture(raw);
    expect(evidence.gate.conclusion).toBe("failure");
    expect(evidence.gate.unresolvedFindingIds).toContain(FINDING_IDS.origin);
  });

  it("rejects a tampered raw artifact instead of evaluating it", () => {
    const raw = structuredClone(rawEvidenceFixture());
    raw.findings[0]!.summary = "changed after signing";
    expect(() => evaluateFixture(raw)).toThrowError(/does not match its canonical JSON/);
  });
});
