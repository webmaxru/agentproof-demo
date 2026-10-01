# Dependency license record

Review date: 2026-09-02. Repository license: MIT.

The Fastify runtime entry was refreshed on 2026-10-01 for the narrow `5.12.5`
patch. Its installed package metadata and distributed `LICENSE` retain MIT.
Other entries retain their original documentation review date.

This record covers declared direct dependencies at documentation time. The
committed `package-lock.json` is authoritative for exact resolved versions and
transitive packages; regenerate the inventory whenever it changes. A package
license is not a security, privacy, export, patent, or compliance approval.

## Workspace packages

| Package                          | Relationship                    | License                |
| -------------------------------- | ------------------------------- | ---------------------- |
| `agentproof`                     | Private workspace root          | MIT repository license |
| `@agentproof/evidence-core`      | Private internal package        | MIT repository license |
| `@agentproof/evidence-cli`       | Private internal package        | MIT repository license |
| `@agentproof/sample-expense-api` | Private internal package        | MIT repository license |
| `@agentproof/evidence-board`     | Private internal canvas package | MIT repository license |

## Declared third-party dependencies

| Package               | Declared range | Use                             | SPDX license | Source to verify                                    |
| --------------------- | -------------- | ------------------------------- | ------------ | --------------------------------------------------- |
| `fastify`             | `5.12.5`       | Synthetic API runtime           | MIT          | Package metadata and `fastify/fastify` license      |
| `yaml`                | `^2.8.1`       | Policy/data declaration parsing | ISC          | Package metadata and `eemeli/yaml` license          |
| `zod`                 | `^3.25.76`     | Runtime contract validation     | MIT          | Package metadata and `colinhacks/zod` license       |
| `@eslint/js`          | `^10.0.1`      | Root JavaScript lint rules      | MIT          | Package metadata and `eslint/eslint` license        |
| `eslint`              | `^10.9.1`      | Static analysis                 | MIT          | Package metadata and `eslint/eslint` license        |
| `prettier`            | `^3.9.6`       | Deterministic formatting        | MIT          | Package metadata and `prettier/prettier` license    |
| `typescript-eslint`   | `^8.69.0`      | TypeScript lint rules           | MIT          | Package metadata and `typescript-eslint` license    |
| `@types/node`         | `^22.18.0`     | Node.js TypeScript declarations | MIT          | DefinitelyTyped package metadata/license            |
| `@vitest/coverage-v8` | `^3.2.4`       | Test coverage                   | MIT          | Package metadata and `vitest-dev/vitest` license    |
| `tsx`                 | `^4.20.5`      | TypeScript development runner   | MIT          | Package metadata and `privatenumber/tsx` license    |
| `typescript`          | `^5.9.2`       | Compiler/type checker           | Apache-2.0   | Package metadata and `microsoft/TypeScript` license |
| `vitest`              | `^3.2.4`       | Unit/integration tests          | MIT          | Package metadata and `vitest-dev/vitest` license    |

Evidence Board currently declares no npm dependencies; it uses Node.js
built-ins and the Copilot SDK supplied by the host. Recheck its final
manifest and the host SDK's applicable terms before release.

## Pinned GitHub Actions

| Action                      | Use                           | Pinning/licensing check                                                   |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| `actions/checkout`          | Trusted/base/subject checkout | Pinned by full SHA; verify upstream MIT license and release/source commit |
| `actions/setup-node`        | Node runtime/cache            | Pinned by full SHA; verify upstream MIT license and release/source commit |
| `actions/upload-artifact`   | Raw/final evidence upload     | Pinned by full SHA; verify upstream MIT license and release/source commit |
| `actions/download-artifact` | Trusted publisher handoff     | Pinned by full SHA; verify upstream MIT license and release/source commit |

Full-SHA pinning controls source version; it does not replace license review.

## Release review procedure

From a clean clone, without modifying dependency manifests:

1. Confirm every `package.json` dependency appears above or in an attached
   generated inventory.
2. Use the committed lockfile to enumerate every resolved package/version,
   including optional and transitive dependencies.
3. Read package metadata plus the distributed `LICENSE`/`NOTICE`; do not rely
   only on a registry summary.
4. Resolve missing, `UNKNOWN`, custom, copyleft, dual, or inconsistent licenses
   with the organization's open-source review owner.
5. Preserve required copyright, license, and notice text in the distributed
   artifact.
6. Verify each pinned Action's exact source commit and license.
7. Update this record, `NOTICE`, and review date; have
   `<OPEN_SOURCE_REVIEW_OWNER>` approve before distribution.

No dependency listed here grants rights to third-party logos, screenshots,
services, models, data, or trademarks.
