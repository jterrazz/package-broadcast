# @jterrazz/broadcast

Multi-channel broadcast system for distributing announcements across platforms. Define an announcement once, send it everywhere — App Store In-App Events, Google Play, push notifications, email, and more.

## Install

```bash
npm install @jterrazz/broadcast
```

## Quick Start

```ts
import { AppleAppStoreAdapter, sendBroadcast } from '@jterrazz/broadcast';

const apple = new AppleAppStoreAdapter({
    issuerId: 'your-issuer-id',
    keyId: 'YOUR_KEY_ID',
    privateKey: '-----BEGIN PRIVATE KEY-----\n...',
    appId: '6444444444',
});

await sendBroadcast(
    {
        title: 'Season 2 is live!',
        shortDescription: 'New features and challenges await',
        longDescription: 'Explore new game modes, leaderboards, and exclusive rewards.',
        badge: 'new-season',
        audience: 'all',
        priority: 'high',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-30'),
        deepLink: 'myapp://seasons/2',
    },
    [apple],
);
```

`sendBroadcast` fans out to all providers concurrently. If one fails, the others still succeed — each result includes a `status` field.

## Broadcast Model

| Field              | Type                 | Description                                        |
| ------------------ | -------------------- | -------------------------------------------------- |
| `title`            | `string`             | Display title (max ~30 chars for App Store compat) |
| `shortDescription` | `string`             | Teaser for cards/previews (max ~50 chars)          |
| `longDescription`  | `string`             | Detail view description (max ~120 chars)           |
| `startDate`        | `Date`               | When the event starts                              |
| `endDate`          | `Date`               | When the event ends                                |
| `badge`            | `BroadcastBadge`     | Event category                                     |
| `audience`         | `BroadcastAudience`  | Target audience                                    |
| `priority`         | `"normal" \| "high"` | Visibility level                                   |
| `deepLink`         | `string?`            | Deep link URL into the app                         |
| `requiresPurchase` | `boolean?`           | Whether participation requires a purchase          |
| `territories`      | `string[]?`          | ISO 3166-1 alpha-2 country codes (default: all)    |

### Badge Types

`challenge` · `competition` · `live-event` · `major-update` · `new-season` · `premiere` · `special-event`

### Audience Types

`all` · `new-users` · `active-users` · `lapsed-users`

## Providers

### Apple App Store (In-App Events)

Creates [In-App Events](https://developer.apple.com/app-store/in-app-events/) on the App Store via the App Store Connect API.

#### Setup

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access** → **Integrations** → **App Store Connect API**
2. Click **Generate API Key**
    - Name: e.g. `signews-broadcast`
    - Access: **Admin** (required for In-App Events)
3. **Download the `.p8` file** — you can only download it once
4. Note the **Key ID** shown in the table (e.g. `2X9R4HXF34`)
5. Copy the **Issuer ID** shown at the top of the page
6. Find your **App ID**: go to **Apps** → your app → **App Information** → **Apple ID**

#### Usage

```ts
import { readFileSync } from 'node:fs';
import { AppleAppStoreAdapter } from '@jterrazz/broadcast';

const apple = new AppleAppStoreAdapter({
    issuerId: '57246542-96fe-1a63-e053-0824d011072a',
    keyId: '2X9R4HXF34',
    privateKey: readFileSync('./AuthKey_2X9R4HXF34.p8', 'utf-8'),
    appId: '6444444444',
});

// Create an event
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

// List existing events
const events = await apple.list();

// Update an event
await apple.update('event-id', { priority: 'normal' });

// Delete an event
await apple.delete('event-id');
```

#### Field Mapping

| Broadcast          | Apple In-App Event                                                             |
| ------------------ | ------------------------------------------------------------------------------ |
| `title`            | `referenceName` + localized `name`                                             |
| `shortDescription` | Localized `shortDescription`                                                   |
| `longDescription`  | Localized `longDescription`                                                    |
| `badge`            | `badge` (CHALLENGE, COMPETITION, etc.)                                         |
| `audience`         | `purpose` (APPROPRIATE_FOR_ALL_USERS, ATTRACT_NEW_USERS, ATTRACT_LAPSED_USERS) |
| `priority`         | `priority` (NORMAL, HIGH)                                                      |
| `requiresPurchase` | `purchaseRequirement` (NO_COST_ASSOCIATED, IN_APP_PURCHASE)                    |
| `territories`      | `territorySchedules`                                                           |
| `deepLink`         | `deepLink`                                                                     |

#### Limits

- Max 15 approved events at a time in App Store Connect
- Max 10 events published simultaneously on the App Store
- Events can last up to 31 days
- Events can be promoted up to 14 days before start

### More Providers (Planned)

- **Google Play Events** — Google Play Store promotional events
- **Push Notifications** — APNs and FCM
- **Email Digests** — Transactional email providers
- **In-App Banners** — JSON/REST endpoint for web and desktop apps

## Multi-Provider Example

```ts
import { sendBroadcast } from '@jterrazz/broadcast';

const results = await sendBroadcast(broadcast, [apple, google, push]);

for (const result of results) {
    if (result.status === 'failed') {
        console.error(`${result.provider} failed:`, result.raw);
    } else {
        console.log(`${result.provider}: ${result.status} (${result.id})`);
    }
}
```

## Custom Provider

Implement `BroadcastProviderPort` to add your own channel:

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

## Development

```bash
npm install
npm test        # Run tests (vitest)
npm run build   # Build ESM + CJS (rolldown)
npm run lint    # Type check + oxlint + oxfmt
```
