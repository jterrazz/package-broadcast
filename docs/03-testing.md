# Testing

Two vitest projects, both run by `npm test`: `unit` for the module tests that sit beside the code they prove, `integration` for the one spec that drives the Apple adapter through a full lifecycle. Neither talks to a real network — there is no suite here that proves this package against the live App Store Connect API, and this page says so rather than implying one exists.

## The two projects

`vitest.config.ts` declares them and nothing else — `defineSpecConfig({ test: { projects: [unit(), integration()] } })`, from `@jterrazz/test/vitest`. The preset carries the time budgets, the artefact directory and the ground the runner must not collect, so what this repository states is only which kinds of test it has.

| Project       | Collects                         | Whose subject is                          |
| ------------- | -------------------------------- | ----------------------------------------- |
| `unit`        | `**/*.test.ts` outside `specs/`  | a module alone                            |
| `integration` | `specs/integration/**/*.test.ts` | a module against a declared outside world |

The fork is the subject, never the amount of machinery. `sendBroadcast` against three doubles is a module alone however many providers it fans out to; the Apple adapter driven create → update → delete is an assembled thing however little it starts.

## Unit tests

Each source file that carries logic has a `*.test.ts` sibling:

- `src/adapters/apple/apple-authentication.test.ts` proves `createAppleJwt` produces a three-part JWT with the header, issuer, audience and expiry App Store Connect requires, against the sample ES256 key of `apple-authentication.fixtures.ts`.
- `src/adapters/apple/apple-app-store.adapter.test.ts` proves `AppleAppStoreAdapter`'s create/update/delete/list, one `describe` block per method, against contracts that declare what App Store Connect answers.
- `src/send-broadcast.test.ts` proves the fan-out: every provider is called, a rejection becomes a `failed` result, and the result order matches the provider order.

## The integration spec

`specs/integration/apple-app-store/lifecycle.test.ts` is the one test that crosses the port/adapter boundary in one file. It runs on `specs/integration/integration.specification.ts` — a runner with no services, because what earns the folder here is the declared world rather than a container — and drives `create` → `list`, `create` → `update` → `delete`, and a refused `create` followed by a successful retry.

What makes it an integration spec rather than another unit test is that it exercises the adapter's whole request pipeline (event, then localization, then the mapped HTTP verb) in sequence, the way a real caller would, instead of one method in isolation. Its subject is handed to `.call()`, so a refusal is read as `result.error` rather than caught by the test.

## The outside world is declared

No suite here stubs `fetch` and none mocks a module. Every outgoing call is a contract — a request to match and a response to serve — and a request no contract accepted fails the block at disposal, after the subject is done and past anything that could have swallowed it.

A module test declares its contracts inline, with `intercept()` from `@jterrazz/test`:

```typescript
await using _ = await intercept(http.delete(`${BASE_URL}/appEvents/event-123`), http.empty());
```

The integration spec declares its own in `specs/integration/apple-app-store/contracts/`: one facade, `app-store.contracts.ts`, whose default export is the world a create lives in and whose named exports are the three scenarios the lifecycle meets; under it, `http/` holds one file per call. Every contract there is `required`, so a call the adapter stops making fails the chain instead of passing quietly.

The filter is the assertion. `http.post(url, { body })` matches a deep subset of what was sent, so a case that once read a field off a spy now declares the request it expects and asserts only what the adapter returned. The one case that proves an ABSENCE — an update carrying nothing but the field the caller changed — keeps a responder and compares the whole body, because a subset filter cannot state that nothing else was sent.

`createAppleJwt` is never doubled either. The suites hold a real ES256 key, so every request carries a token that was actually signed, and the adapter's `Authorization` header is matched as a three-part JWT rather than as a string a mock agreed to.

## What proves a change

| Change                                               | Proof                                                                                                    |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A new field on `Broadcast`                           | a unit test on the adapter that maps it, plus the integration spec if it changes the request sequence    |
| A new channel                                        | its own `*.adapter.test.ts`, declaring that channel's transport the way the Apple suite declares Apple's |
| The fan-out (`sendBroadcast`)                        | `src/send-broadcast.test.ts`                                                                             |
| Apple's request pipeline (create/update/delete/list) | `apple-app-store.adapter.test.ts` and the integration spec                                               |

## The conventions the lint enforces

`oxlint.config.ts` composes `@jterrazz/test`'s `testing` fragment (see [Developing](02-developing.md)), so the suites are judged, not only run. Two rules bind every test here: each body narrates itself with a `// Given -` comment and a `// Then -` comment, in that order (B4 — the marker is a hyphen, not a dash), and the vitest rules cap assertion count and demand typed mocks.

The fragment's structural rules are satisfied rather than recorded. A test is the sibling of the module it covers or a spec under `specs/`, and nothing under `src/` reaches for `vi.mock` — the two entries `oxlint.baseline.json` used to carry for those conventions are gone, and what the file still holds is the ordinary typing debt described in [Developing](02-developing.md).

## Running it

```bash
npm test                        # both projects
npx vitest --run --project unit # one of them
```

`typescript check` (`npm run lint`) runs alongside but proves shape, not behaviour — type-checking, lint, and format are gates on the code, not on what it does at runtime.
