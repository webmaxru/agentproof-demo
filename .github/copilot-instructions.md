# AgentProof repository instructions

- Treat `policy/release-policy.yml` from the protected base revision as authoritative.
- Never describe scanner output as a legal or compliance determination.
- Preserve `pass`, `fail`, `unknown`, and `exception` as distinct evidence states.
- Bind evidence and human dispositions to the full pull-request head SHA.
- Do not accept an exception, approve a pull request, merge, or release on behalf of a human.
- Keep reviewer agents read-only. Remediation must happen in a separate, reviewable session.
- Never place secrets, customer data, tenant links, or private evidence in prompts, canvas state, fixtures, or logs.
- The Evidence Board is mutable coordination state. GitHub checks, comments, reviews, artifacts, and repository rules are the auditable record and enforcement boundary.
