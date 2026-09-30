# Cleanup

Cleanup must cover the App and GitHub; deleting local files does not remove App
sessions, a personal automation experiment, or remote evidence.

The 2026-09-03 private-lab permission canary was saved, triggered three times,
and disabled after runtime validation exposed mutation-capable built-ins. It is
not a reviewer automation. Do not report three live reviewer automations.

## Copilot App

1. Inspect the current user's automation inventory for `<OWNER>/<REPO>`.
2. Keep the failed canary disabled while its non-sensitive validation record is
   needed, then delete that specific personal automation under the approved
   retention process. Do not assume Test, Security, or Policy reviewer
   automations exist.
3. Confirm no enabled personal automation remains for either the primary
   repository or the private automation lab.
4. Close disposable manual reviewer, assembler, and remediation sessions
   according to the organization's retention policy.
5. Clear Evidence Board state. Remember that clearing a mutable canvas does not
   delete GitHub records.
6. Uninstall AgentProof `v0.2.1` or its replacement if it is no longer approved
   or needed.
7. Remove obsolete deep-link bookmarks. Remove an automation inventory entry
   only if an automation had actually been saved.

A future automation is personal and stored outside Git, so repeat its
inspection and cleanup for every owner who actually created one. A deep link
must always require review and confirmation; deleting a template does not
disable an external configuration.

## GitHub

1. Close the synthetic demo PR without merging, or preserve the merged record
   only if the approved demonstration-retention policy requires it.
2. Delete disposable demo branches after recording any authorized evidence.
3. Disable/remove the AgentProof ruleset and optional environment only when the
   repository is being retired; do not leave a protected production branch
   weaker than its approved baseline.
4. Delete Actions artifacts/logs using GitHub's supported UI/API if immediate
   removal is required; otherwise verify configured expiry. Artifact retention
   is finite but not instantaneous.
5. Remove repository variables/secrets accidentally created for testing. The
   MVP requires none; investigate any that exist rather than exposing values.
6. Remove collaborators/teams granted only for the demo.
7. Archive or delete `<OWNER>/<REPO>` under the owner's approved process.
8. If screenshots/video remain, retain only redacted, synthetic, clearly
   labeled assets and delete superseded captures.

## Local machine

From outside the clone, delete the local `AgentProof` directory using the
operating system's normal deletion process after preserving authorized work.
Also remove any separately downloaded evidence artifacts or recordings. Do not
delete shared Node/npm caches as part of this project cleanup.

## Verify

- No enabled personal automation targets the retired repositories; the disabled
  2026-09-03 canary is retained or deleted according to the approved record.
- No plugin development install remains.
- No open PR, branch, ruleset bypass, environment, or temporary collaborator
  remains unintentionally.
- Evidence/media retention matches the approved policy.
- No customer data, token, tenant URL, or secret was introduced.

Cleanup removes the prototype; it does not retroactively revoke copies already
downloaded by authorized repository readers. It also does not turn reviewer or
scanner output into a legal or compliance determination.
