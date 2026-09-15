# Developing

How a change to this package is made: the toolchain it wires, the commands the Makefile and `package.json` expose, and where a change opens a file.

## Setup

```bash
npm install
```

No build step is needed to run the tests or the lint — they read `src/` directly. `npm run build` (`typescript bundle`) is only needed to produce the `dist/` this package publishes.

## The toolchain

`@jterrazz/typescript` is the sole devDependency the toolchain needs, and this package names one profile of it: `library`, the profile for a package published to a registry. `tsconfig.json` extends its `library` preset, `oxlint.config.ts` extends the `library` rule set, and `oxfmt.config.ts` hands its config straight to `oxfmt`.

Each of the two lint configs names the type of its default export, because the `library` tsconfig carries `isolatedDeclarations` and will not infer one. That preset is also what forbids an `enum`, a `namespace` and a parameter property anywhere in `src/` — a published package emits declarations, and those three cannot be erased.

`npm run lint` is `typescript check` — type-check, lint, format-check, the gitignore/artefact convention, unused-code, and, run from the repository root, the manual-layout gate this corpus now answers to. `npm run lint:fix` is `typescript fix`.

| Command            | Runs                                               |
| ------------------ | -------------------------------------------------- |
| `npm test`         | `vitest --run` — see [Testing](03-testing.md)      |
| `npm run lint`     | `typescript check`                                 |
| `npm run lint:fix` | `typescript fix`                                   |
| `npm run build`    | `typescript bundle` — ESM + CJS + types to `dist/` |

The `Makefile` wraps the same three behind `make install` / `make build` / `make lint` / `make test`, each depending on a `node_modules/.install` sentinel keyed off `package-lock.json` so a stale install is never silently reused.

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

A file named `*.port.ts` holds a contract, never an implementation; a file named `*.adapter.ts` holds one channel's implementation and nothing another channel needs. A test lives beside the file it proves, named `*.test.ts` — see [Testing](03-testing.md) for the one exception.

## Conventions

- Every export a consumer can reach passes through `src/index.ts` — no deep import path is public API.
- A closed union (`BroadcastBadge`, `BroadcastAudience`, a result's `status`) is exhaustively mapped wherever an adapter translates it; a new value added to the port is a compile error in every adapter until it is handled.
- A provider never throws past its own boundary in `sendBroadcast` — `create`/`update`/`delete`/`list` may reject, and the core turns that rejection into a `failed` result. An adapter's own errors (`AppleAppStoreError`) still carry enough to debug a rejection when one is inspected directly.
