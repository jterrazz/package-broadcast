# Channels

A channel is one implementation of `BroadcastProviderPort` (`src/ports/broadcast.port.ts:80` — see [Architecture](01-architecture.md)): `create`, `update`, `delete`, `list`, plus a `name`. This chapter holds what today's one channel, Apple App Store In-App Events, needs to be configured and called, and what is planned next.

## Apple App Store (In-App Events)

`AppleAppStoreAdapter` (`src/adapters/apple/apple-app-store.adapter.ts:22`) creates [In-App Events](https://developer.apple.com/app-store/in-app-events/) through the App Store Connect API.

### Credentials

1. App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API**.
2. **Generate API Key**, access **Admin** (In-App Events require it).
3. Download the `.p8` file — it can only be downloaded once.
4. Note the **Key ID** shown beside it, and the **Issuer ID** shown at the top of the page.
5. The **App ID** is under **Apps** → the app → **App Information** → **Apple ID**.

```ts
import { readFileSync } from 'node:fs';
import { AppleAppStoreAdapter } from '@jterrazz/broadcast';

const apple = new AppleAppStoreAdapter({
    issuerId: '57246542-96fe-1a63-e053-0824d011072a',
    keyId: '2X9R4HXF34',
    privateKey: readFileSync('./AuthKey_2X9R4HXF34.p8', 'utf-8'),
    appId: '6444444444',
});
```

### Calling it

```ts
const result = await apple.create({
    title: 'Election Live Coverage',
    shortDescription: 'Real-time results & analysis',
    longDescription: 'Follow live election coverage with AI-powered fact-checking and analysis.',
    badge: 'live-event',
    audience: 'all',
    priority: 'high',
    startDate: new Date('2026-11-03'),
    endDate: new Date('2026-11-04'),
    deepLink: 'signews://live/election-2026',
    territories: ['USA', 'FRA'],
});

const events = await apple.list();
await apple.update('event-id', { priority: 'normal' });
await apple.delete('event-id');
```

### Field mapping

| Broadcast          | Apple In-App Event                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| `title`            | `referenceName` + localized `name`                                                                   |
| `shortDescription` | localized `shortDescription`                                                                         |
| `longDescription`  | localized `longDescription`                                                                          |
| `badge`            | `badge` (`CHALLENGE`, `COMPETITION`, …) — `mapBadge` in the adapter                                  |
| `audience`         | `purpose` (`APPROPRIATE_FOR_ALL_USERS`, `ATTRACT_NEW_USERS`, `ATTRACT_LAPSED_USERS`) — `mapAudience` |
| `priority`         | `priority` (`NORMAL`, `HIGH`)                                                                        |
| `requiresPurchase` | `purchaseRequirement` (`NO_COST_ASSOCIATED`, `IN_APP_PURCHASE`)                                      |
| `territories`      | `territorySchedules`                                                                                 |
| `deepLink`         | `deepLink`                                                                                           |
| `cardImageUrl`     | uploaded as the `EVENT_CARD` asset, 16:9                                                             |
| `detailImageUrl`   | uploaded as the `EVENT_DETAILS_PAGE` asset, 9:16                                                     |

### Limits

- Max 15 approved events at a time in App Store Connect.
- Max 10 events published simultaneously on the App Store.
- Events can last up to 31 days.
- Events can be promoted up to 14 days before their start.

## Planned channels

Not implemented today — no `src/adapters/` directory exists for any of these yet:

- **Google Play Events** — Google Play Store promotional events.
- **Push Notifications** — APNs and FCM.
- **Email Digests** — transactional email providers.
- **In-App Banners** — a JSON/REST endpoint for web and desktop apps.

## Writing a custom channel

Implement `BroadcastProviderPort` and pass an instance to `sendBroadcast` alongside (or instead of) the built-in channels — nothing in the core or the port needs to know a new channel exists:

```ts
import type { BroadcastProviderPort } from '@jterrazz/broadcast';

class SlackProvider implements BroadcastProviderPort {
    readonly name = 'slack';

    async create(broadcast) {
        // Post to Slack webhook
    }

    async update(id, broadcast) {
        /* ... */
    }
    async delete(id) {
        /* ... */
    }
    async list() {
        /* ... */
    }
}
```

A channel this package ships itself follows [Developing](02-developing.md)'s convention: its own directory under `src/adapters/`, exported from `src/index.ts`, with a `*.adapter.test.ts` and, when its request pipeline has more than one step, its own place in the integration suite (see [Testing](03-testing.md)).
