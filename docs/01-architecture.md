# Architecture

Three layers, one direction of dependency: a platform-agnostic **port** describes what a broadcast is and what a provider must do with one, a tiny **core** fans a broadcast out to every provider concurrently, and one **adapter** per channel turns the port's shape into that channel's own API calls. Nothing outside `src/adapters/` knows an HTTP endpoint exists.

```
src/
├── ports/
│   └── broadcast.port.ts        # Broadcast, BroadcastResult, BroadcastProviderPort
├── send-broadcast.ts            # sendBroadcast(broadcast, providers) — the fan-out
├── adapters/
│   └── apple/
│       ├── apple-auth.ts        # createAppleJwt — ES256 JWT for App Store Connect
│       └── apple-app-store.adapter.ts   # AppleAppStoreAdapter
└── index.ts                     # the public barrel — every export above and nothing else
```

## The port

`src/ports/broadcast.port.ts:5` declares `Broadcast`, the announcement shape every provider receives: a title, two descriptions, a start and end date, a `badge` and an `audience` drawn from closed unions, a priority, and optional fields (`deepLink`, `requiresPurchase`, `territories`, two image URLs). `BroadcastProviderPort` (`src/ports/broadcast.port.ts:80`) is the contract a channel implements — `create`, `update`, `delete`, `list` — and `BroadcastResult` (`src/ports/broadcast.port.ts:63`) is what any of those four calls returns: a provider-assigned id, the provider's own name, a status drawn from a closed union (`created`, `submitted`, `approved`, `published`, `rejected`, `failed`), and the raw provider response for debugging.

No adapter-specific type crosses this file. A provider translates the port's shape into its own wire format internally and translates the response back — the port never grows an Apple-shaped or a Google-shaped field.

## The core

`sendBroadcast` (`src/send-broadcast.ts:7`) is the only orchestration this package does: it calls `create` on every provider with `Promise.allSettled` and maps a rejection into a `BroadcastResult` with `status: 'failed'` instead of letting one provider's failure reject the whole call. A caller always gets back one result per provider, in the same order the providers were given, whichever succeeded and whichever did not.

## The adapters

Today there is one channel, `apple/`, split into two files on purpose:

- `apple-auth.ts` (`src/adapters/apple/apple-auth.ts:24`) owns nothing but the ES256 JWT App Store Connect requires on every call — a 20-minute token, signed with `jose`. It knows nothing about broadcasts or events.
- `apple-app-store.adapter.ts` (`src/adapters/apple/apple-app-store.adapter.ts:22`) is `AppleAppStoreAdapter`, the `BroadcastProviderPort` implementation. `create` is itself a small pipeline against the App Store Connect API — create the event, create its localization, then upload the card and detail images if their URLs were given — and `list`/`update`/`delete` each map the port's vocabulary onto Apple's (`mapBadge`, `mapAudience`, `mapAppleStatus`, private to the file). A failed HTTP call raises `AppleAppStoreError`, carrying the status code and the response body.

A second channel is added the same way: a new directory under `src/adapters/`, a class implementing `BroadcastProviderPort`, exported from `src/index.ts`. See [Channels](05-channels.md) for what is planned there today.

## The barrel

`src/index.ts` is the one file consumers import from. It re-exports the port's types, `sendBroadcast`, and the Apple adapter's class, config type and error type — nothing that is not meant to be public reaches past it.
