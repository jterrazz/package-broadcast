# Develop

How a change to this package is made: the declaration every config follows, the gestures, where a new file goes, and what a change owes. What the package is made of is [Architecture](../concepts/architecture.md).

## The declaration

`@jterrazz/typescript` supplies the whole toolchain (build, type-check, lint, format, unused code, mutation) from one devDependency, and `jterrazz.config.ts` says what this package is: a `library` on `node`, held to `@jterrazz/test`'s preset. Every other config follows from that line:

- `oxlint.config.ts`, `oxfmt.config.ts`, `tsconfig.json` and `vitest.config.ts` are the one-line derivations `typescript fix` writes and `typescript check` refuses to see edited;
- knip, the build and Stryker are configured by the commands that run them, from the declaration and the manifest;
- the one published entry, `.`, is read off `package.json#exports` and built from `src/index.ts`, as ESM and CommonJS with its declarations.

The declaration holds no exception, and no debt is recorded: there is no `.jterrazz/` ledger.

## The gestures

| Gesture         | Runs                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| `make install`  | `npm ci`, once per change of the lockfile                                                                   |
| `make build`    | `typescript build`: the entry the manifest publishes, into `dist/`                                          |
| `make lint`     | `typescript check`: every pass, after a build, since the Publish (packaging) pass reads `dist/`             |
| `make fix`      | `typescript fix`: the derived files, the formatter, the fixable findings                                    |
| `make test`     | the specs, after a build, since the packaging specs install the tarball `npm pack` writes ([Test](test.md)) |
| `make mutation` | `typescript mutation`: the zero-survivor verdict over the change ([Test](test.md#mutation))                 |
| `make check`    | `make lint`, `make test`, then `make mutation`: the gate before a commit                                    |

Build, test and lint output lands under `.artifacts/`, which `.gitignore` ignores whole; `dist/` is the published product, not an artefact.

## Where a new file goes

| Adding                                             | Goes in                                                                                                  |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| a field on the broadcast model, or a status value  | `src/ports/broadcast.port.ts`                                                                            |
| the fan-out behaviour (concurrency, failure shape) | `src/send-broadcast.ts`                                                                                  |
| a channel                                          | a directory under `src/adapters/`, exported from `src/index.ts` ([Write a channel](write-a-channel.md))  |
| Apple-specific behaviour                           | `src/adapters/apple/`                                                                                    |
| a behaviour a consumer relies on                   | a spec under `specs/integration/<subject>/` ([Test](test.md))                                            |
| a module test                                      | `<folder>/__tests__/<module>.test.ts`, kept only on the criteria [Test](test.md#what-earns-a-test) names |

A file named `*.port.ts` holds a contract, never an implementation; a file named `*.adapter.ts` holds one channel's implementation and nothing another channel needs.

## What a change owes

A new or changed export reaches the root `README.md`, the page of this manual that owns it and the `skills/jterrazz-broadcast/` skill in the same change: none of the three is generated, so nothing catches a stale one. A comment states the kind of thing the code cannot say (`invariant:`, `hazard:`, `outside:`, `value:`), or it is not written; a public symbol keeps a one-line hover.

- Every export a consumer can reach passes through `src/index.ts`; no deep import path is public API.
- A closed union (`BroadcastBadge`, `BroadcastAudience`, a result's `status`) is mapped exhaustively wherever an adapter translates it, so a value added to the port is a compile error in every adapter until it is handled.
- A provider may reject from any of its four calls; `sendBroadcast` turns a rejection into a `failed` result, and an adapter's own error (`AppleAppStoreError`) still carries what a caller needs to read the refusal.

## Related

- [Architecture](../concepts/architecture.md): the layers these files implement.
- [Test](test.md): how a change to one of them is proven.
