# Architecture

Three layers, one direction of dependency: a platform-agnostic **port** describes what a broadcast is and what a provider must do with one, a tiny **core** fans a broadcast out to every provider concurrently, and one **adapter** per channel turns the port's shape into that channel's own API calls. Nothing outside `src/adapters/` knows an HTTP endpoint exists.

```text
src/
├── ports/
│   └── broadcast.port.ts        # Broadcast, BroadcastResult, BroadcastProviderPort
├── send-broadcast.ts            # sendBroadcast(broadcast, providers) — the fan-out
├── adapters/
│   └── apple/
│       ├── apple-app-store.adapter.ts # AppleAppStoreAdapter — create, list, update, delete
│       ├── apple-authentication.ts    # createAppleJwt — ES256 JWT for App Store Connect
│       ├── app-store-connect.ts       # one API call: the token, the JSON, the refusal
│       ├── apple-app-store.schemas.ts # the shape of each answer, and its reading
│       ├── apple-app-store.mapping.ts # the port's vocabulary in Apple's spelling
│       ├── apple-event-image.ts       # an image: downloaded, reserved, uploaded, committed
│       └── apple-app-store.error.ts   # AppleAppStoreError — the status code and the body
└── index.ts                     # the public barrel — every export above and nothing else
```

## The port

`src/ports/broadcast.port.ts` declares `Broadcast`, the announcement shape every provider receives: a title, two descriptions, a start and end date, a `badge` and an `audience` drawn from closed unions, a priority, and optional fields (`deepLink`, `requiresPurchase`, `territories`, two image URLs). `BroadcastProviderPort` is the contract a channel implements — `create`, `update`, `delete`, `list` — and `BroadcastResult` is what any of those four calls returns: a provider-assigned id, the provider's own name, a status drawn from a closed union (`created`, `submitted`, `approved`, `published`, `rejected`, `failed`), and the raw provider response for debugging.

No adapter-specific type crosses this file. A provider translates the port's shape into its own wire format internally and translates the response back — the port never grows an Apple-shaped or a Google-shaped field.

## The core

`sendBroadcast` is the only orchestration this package does: it calls `create` on every provider at once and catches each provider's rejection where it is raised, turning it into a `BroadcastResult` with `status: 'failed'` instead of letting one provider's failure reject the whole call. A caller always gets back one result per provider, in the same order the providers were given, whichever succeeded and whichever did not.

## The adapters

Today there is one channel, `apple/`, cut by concern:

- `apple-app-store.adapter.ts` is `AppleAppStoreAdapter`, the `BroadcastProviderPort` implementation, and only the order of the calls: `create` creates the event, then its localization, then uploads the card and the detail image when their URLs are given; `list`, `update` and `delete` are one call each.
- `apple-authentication.ts` owns nothing but the ES256 JWT App Store Connect requires on every call — a 20-minute token, signed with `jose`. It is public, for a consumer calling App Store Connect itself.
- `app-store-connect.ts` makes one call: the bearer token, the JSON body, and a refusal raised as `AppleAppStoreError` (`apple-app-store.error.ts`), which carries the status code and the raw response body so a rejection stays debuggable once it has left the adapter.
- `apple-app-store.schemas.ts` describes, with zod, the answers the adapter reads, and refuses an answer of another shape with the path of what it lacks, rather than letting an `undefined` id travel on; an event is read as a loose object, so a result's `raw` keeps every field Apple sent.
- `apple-app-store.mapping.ts` turns the port's vocabulary into Apple's — the badge, the audience as a purpose, the priority, the purchase requirement, the territory schedule — and Apple's event states back into the port's statuses.
- `apple-event-image.ts` is the image pipeline: the download, the screenshot reservation named after the image's content type, the upload of each chunk as Apple's operations say, the commit.

[Apple App Store](../reference/apple-app-store.md) is the reference of what each call sends.

A second channel is added the same way: a new directory under `src/adapters/`, a class implementing `BroadcastProviderPort`, exported from `src/index.ts`. [Write a channel](../guides/write-a-channel.md) says how, and what is planned.

## The barrel

`src/index.ts` is the one file consumers import from. It re-exports the port's types, `sendBroadcast`, and the Apple adapter's class, config type and error type — nothing that is not meant to be public reaches past it.
