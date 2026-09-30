import { readFile } from "node:fs/promises";
import {
  assertPositiveInteger,
  githubPaginate,
  githubRequest,
  repositoryFromEnvironment,
} from "./github-api.mjs";
import { validateRulesetPayload } from "./workflow-helpers.mjs";

const apply = process.argv.includes("--apply");
const repository = repositoryFromEnvironment();
const payload = validateRulesetPayload(
  JSON.parse(await readFile(new URL("../rulesets/agentproof.json", import.meta.url), "utf8")),
);

if (!apply) {
  console.log(JSON.stringify(payload, null, 2));
  console.log("\nDry run only. Pass --apply with an administration-capable GITHUB_TOKEN.");
  process.exit(0);
}

const rulesets = await githubPaginate(
  `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/rulesets?includes_parents=false&targets=branch`,
);
const existing = rulesets.find(
  (ruleset) => ruleset.name === payload.name && ruleset.source_type === "Repository",
);

if (existing) {
  const rulesetId = assertPositiveInteger(existing.id, "ruleset id");
  await githubRequest(
    `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/rulesets/${rulesetId}`,
    { method: "PUT", body: payload },
  );
  console.log(`Updated ruleset ${payload.name} (${rulesetId}).`);
} else {
  const created = await githubRequest(
    `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/rulesets`,
    { method: "POST", body: payload },
  );
  console.log(`Created ruleset ${payload.name} (${created.id}).`);
}
