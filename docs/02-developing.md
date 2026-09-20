# Developing

How a change to this package is made: the toolchain it wires, the commands the Makefile and `package.json` expose, and where a change opens a file.

## Setup

```bash
npm install
```

No build step is needed to run the tests — they read `src/` directly. The lint is different: `npm run lint`'s Publish (packaging) pass reads `dist/` through the `exports` map, so on a fresh checkout `npm run build` runs before `npm run lint` or the pass fails on files that do not exist yet, not on anything the change itself broke.

## The toolchain

The toolchain is two devDependencies. `@jterrazz/typescript` carries the profile this package names — `library`, the profile for a package published to a registry: `tsconfig.json` extends its `library` preset and `oxfmt.config.ts` hands its config straight to `oxfmt`. `@jterrazz/test` carries two things: the `testing` fragment, the conventions the suites answer to, which `oxlint.config.ts` composes with the profile — `compose(library, testing)`, the shape every repository of the estate with a test suite uses — and the runner preset `vitest.config.ts` states its projects through, `defineSpecConfig` from `@jterrazz/test/vitest`. A member with tests of its own owes that config: without it, vitest's own 5 s budget is what the suites inherit rather than what they chose.

`oxfmt.config.ts` names the type of its default export, because the `library` tsconfig carries `isolatedDeclarations` and will not infer one; `oxlint.config.ts` does not need to, because `compose` is declared as returning `OxlintConfig` and `defineConfig` passes that type straight through — nothing is left to infer. That preset is also what forbids an `enum`, a `namespace` and a parameter property anywhere in `src/` — a published package emits declarations, and those three cannot be erased.

`npm run lint` is `typescript check` — type-check, lint, format-check, the gitignore/artefact convention, unused-code, and, run from the repository root, the manual-layout gate this corpus now answers to. `npm run lint:fix` is `typescript fix`.

| Command            | Runs                                                         |
| ------------------ | ------------------------------------------------------------ |
| `npm test`         | `vitest --run`, both projects — see [Testing](03-testing.md) |
| `npm run lint`     | `typescript check`                                           |
| `npm run lint:fix` | `typescript fix`                                             |
| `npm run build`    | `typescript bundle` — ESM + CJS + types to `dist/`           |

The `Makefile` wraps the same three behind `make install` / `make build` / `make lint` / `make test`, each depending on a `node_modules/.install` sentinel keyed off `package-lock.json` so a stale install is never silently reused. `make lint` depends on `make build` itself, so a fresh checkout's `make lint` produces `dist/` before its Publish (packaging) pass reads it — `npm run lint` alone still needs `npm run build` first, since the two `package.json` scripts do not chain.

Build, test and lint artefacts live under `.artifacts/<tool>/`, per the toolchain's own convention — nothing this package's own tooling writes should land anywhere else.

`oxlint.baseline.json` at the root is the one file that records debt rather than intent: the diagnostics the v10 rulebook found on adoption that were not cheap to pay, counted per rule. The oxlint pass is judged against it, and it may only shrink — a rule going up, a rule nobody recorded, and an entry that has reached zero all fail the run. It is a ledger to empty, not a setting to keep.

## Where a change opens a file

| Change                                             | File                                                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A field on the broadcast model, or a status value  | `src/ports/broadcast.port.ts`                                                                        |
| The fan-out behaviour (concurrency, failure shape) | `src/send-broadcast.ts`                                                                              |
| A new channel                                      | a new directory under `src/adapters/`, exported from `src/index.ts` — see [Channels](05-channels.md) |
| Apple-specific behaviour                           | `src/adapters/apple/apple-app-store.adapter.ts` or `apple-authentication.ts`                         |
| What a consumer can import                         | `src/index.ts`                                                                                       |

A file named `*.port.ts` holds a contract, never an implementation; a file named `*.adapter.ts` holds one channel's implementation and nothing another channel needs. A test lives beside the file it proves, named `*.test.ts`; the one subject that does not is the Apple lifecycle, which lives under `specs/integration/` and is named `*.spec.ts` for it — see [Testing](03-testing.md) for which fork sends a test where, and which suffix follows.

## Conventions

- Every export a consumer can reach passes through `src/index.ts` — no deep import path is public API.
- A closed union (`BroadcastBadge`, `BroadcastAudience`, a result's `status`) is exhaustively mapped wherever an adapter translates it; a new value added to the port is a compile error in every adapter until it is handled.
- A provider never throws past its own boundary in `sendBroadcast` — `create`/`update`/`delete`/`list` may reject, and the core turns that rejection into a `failed` result. An adapter's own errors (`AppleAppStoreError`) still carry enough to debug a rejection when one is inspected directly.
