# Testing

Two vitest suites, both run by `npm test` (`vitest --run`): unit tests beside the code they prove, and one integration test that drives the Apple adapter through a full lifecycle against a stubbed `fetch`. Neither talks to a real network — there is no suite here that proves this package against the live App Store Connect API, and this page says so rather than implying one exists.

## Unit tests

Each source file that carries logic has a `*.test.ts` sibling:

- `src/adapters/apple/apple-authentication.test.ts` proves `createAppleJwt` produces a three-part JWT with the header, issuer, audience and expiry App Store Connect requires, against a sample ES256 key committed in the file, which opens nothing.
- `src/adapters/apple/apple-app-store.adapter.test.ts` proves `AppleAppStoreAdapter`'s create/update/delete/list against a `vi.stubGlobal('fetch', …)` mock, one `describe` block per method, with `createAppleJwt` itself mocked out (`vi.mock(import('./apple-authentication.js'), …)`) so these tests do not depend on the auth suite passing.
- `src/send-broadcast.test.ts` proves the fan-out: every provider is called, a rejection becomes a `failed` result, and the result order matches the provider order.

## The integration test

`tests/integration/provider-lifecycle.integration.test.ts` is the one test that crosses the port/adapter boundary in one file: it builds a real `AppleAppStoreAdapter`, mocks only the two things a unit test cannot fake honestly — the global `fetch` and `createAppleJwt` — and drives `create` → `list`, `create` → `update` → `delete`, a failed `create` followed by a successful retry, and `sendBroadcast` fanning out to three providers with one rejecting. What makes it an integration test rather than another unit test is that it exercises the adapter's whole request pipeline (event, then localization, then the mapped HTTP verb) in sequence, the way a real caller would, instead of one method in isolation.

## What proves a change

| Change                                               | Proof                                                                                                 |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| A new field on `Broadcast`                           | a unit test on the adapter that maps it, plus the integration test if it changes the request sequence |
| A new channel                                        | its own `*.adapter.test.ts`, mocking that channel's transport the way the Apple suite mocks `fetch`   |
| The fan-out (`sendBroadcast`)                        | `src/send-broadcast.test.ts`                                                                          |
| Apple's request pipeline (create/update/delete/list) | `apple-app-store.adapter.test.ts` and the integration suite                                           |

## Running it

```bash
npm test        # vitest --run, both suites
```

`typescript check` (`npm run lint`) runs alongside but proves shape, not behaviour — type-checking, lint, and format are gates on the code, not on what it does at runtime.
