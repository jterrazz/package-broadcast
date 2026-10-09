# Test

What proves a change here is a specification of what a consumer meets: the package's public entry called against a declared App Store Connect, and the tarball `npm pack` writes installed in a consumer's project. There is no module test today.

```bash
make test       # builds, then runs every spec
make mutation   # the zero-survivor verdict over the change
```

## The specs

Two specifications, two runners, each at the root of its folder under `specs/`.

**`specs/integration/`** calls the package through `src/index.ts` — what a consumer imports — on a runner with no services: what earns the folder is the outside world the calls meet, declared as stubs. One subject per folder:

| Spec                                        | Proves                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apple-app-store/create.spec.ts`            | the event and its English localization, the event's whole body compared as Apple received it and read by its id alone; each attribute in Apple's spelling — each badge, each audience, priority, purchase, territories and their default, the empty deep link — and a refusal raised as an `AppleAppStoreError` carrying Apple's status and body |
| `apple-app-store/images.spec.ts`            | the card and the detail image: downloaded, reserved under the name their content type gives, uploaded chunk by chunk as Apple's operations say — none, or one naming no header, included — committed; nothing fetched for an empty URL; a missing image and a refused chunk refusing the create                                                  |
| `apple-app-store/list.spec.ts`              | every event state read as the status it means, an unknown one as `created`; the event kept as the result's raw                                                                                                                                                                                                                                   |
| `apple-app-store/update.spec.ts`            | the patch carries exactly the fields the caller gave, in Apple's spelling, and the event's new state                                                                                                                                                                                                                                             |
| `apple-app-store/delete.spec.ts`            | the deletion, and the refusal of an event Apple does not know                                                                                                                                                                                                                                                                                    |
| `apple-app-store/unexpected-answer.spec.ts` | an answer missing an event's id or state is refused with the path of what is missing                                                                                                                                                                                                                                                             |
| `apple-authentication/token.spec.ts`        | the token verifies against the key's public half and names the key, the issuer, Apple's audience and a 20-minute life; a key that is no PKCS#8 PEM is refused                                                                                                                                                                                    |
| `send-broadcast/fan-out.spec.ts`            | one result per channel in order — an Apple app taking the event, a second refusing it, a consumer's own channel — the refusal failing alone                                                                                                                                                                                                      |

The stubs sit in `specs/integration/__setup__/stubs/`: `app-store.stubs.ts` names the worlds and the scenarios a spec imports, `http/` one unit per call. Every unit is `required`, so a call the adapter stops making fails the chain; the network is strict from the first stub, so a call nobody declared fails it too. A filter is the assertion: a request that does not carry the attributes a stub names matches nothing. A filter cannot state an absence, so the two stubs whose body must be proven whole — the event created, the patch — echo the body they received into their answer, and `create.spec.ts`'s first test and `update.spec.ts` compare it whole. `__setup__/app-store-connect.ts` holds the app, the spring broadcast the specs send, and a real ES256 key pair minted per run, so every request carries a token that was really signed.

**`specs/cli/`** runs `node` in a consumer's project (`node/__fixtures__/consumer/`) with the packed package installed by `.link('@jterrazz/broadcast', packed())` — the tarball beside what its `dependencies` name, never the checkout's whole install, so a file `files` leaves out or an import the manifest does not declare fails here as it would for a consumer:

| Spec                        | Proves                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `node/subpaths.spec.ts`     | the ESM and CommonJS builds name the same API                                                           |
| `node/declarations.spec.ts` | a consumer's channel and broadcast compile against the shipped `.d.ts`, and an unknown badge is refused |

The packaging specs pack `dist/`, never `src/`: `make test` builds first, but a spec run on its own straight after an edit tests the previous build — run `make build` before it.

## What no spec proves

No suite here reaches the live App Store Connect API: the stubs state what Apple answers, and nothing runs them against Apple. A change of Apple's API shows in production, not here.

## What earns a test

A behaviour a consumer relies on is specified through the public entry. A module test is kept only for a pure algorithm whose edges are cheaper at its own level, or for a failure no consumer's call can provoke honestly; none of the modules here is either, so the three module tests the package once had were promoted to the specs above, and the old lifecycle spec, which only repeated them, was deleted.

## Mutation

`make mutation` runs `typescript mutation`: Stryker mutates the lines a change touched, and the whole suite runs against each mutant. A mutant that a test runs and none detects fails the gate. With nothing uncommitted it measures the last commit; measure a whole branch with `npx typescript mutation --since <commit>`, or every source with `--mutate`, its ranges comma-separated:

```bash
npx typescript mutation --mutate "$(ls src/*.ts src/*/*.ts src/*/*/*.ts | sed 's/$/:1-500/' | paste -sd, -)"
```

## Related

- [Develop](develop.md) — the gestures, and where a new file goes.
- [Apple App Store](../reference/apple-app-store.md) — what each call sends, which the stubs declare.
