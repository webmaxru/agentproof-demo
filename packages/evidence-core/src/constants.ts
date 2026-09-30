export const AGENTPROOF_VERSION = "0.1.0";
export const EVIDENCE_SCHEMA_VERSION = "1.0.0";
export const POLICY_SCHEMA_VERSION = "1.0.0";
export const DISPOSITION_SCHEMA_VERSION = "1.0.0";
export const ZERO_SHA256 = "0".repeat(64);

export const SEVERITIES = ["info", "low", "moderate", "high", "critical"] as const;

export const FINDING_STATES = ["pass", "fail", "unknown", "exception"] as const;

export const REPOSITORY_PERMISSIONS = [
  "none",
  "read",
  "triage",
  "write",
  "maintain",
  "admin",
] as const;

export const FINDING_IDS = {
  testSuite: "AP-TEST-SUITE-001",
  testCoverage: "AP-TEST-COVERAGE-001",
  authorizationTest: "AP-TEST-AUTHORIZATION-001",
  npmAudit: "AP-SEC-NPM-AUDIT-001",
  dataRetention: "AP-POL-RETENTION-001",
  origin: "AP-PROV-ORIGIN-001",
  collectorIntegrity: "AP-POL-COLLECTOR-INTEGRITY-001",
} as const;
