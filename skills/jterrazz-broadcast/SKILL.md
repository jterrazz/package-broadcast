---
name: jterrazz-broadcast
description: Multi-channel announcements via @jterrazz/broadcast: App Store in-app events, and channels of your own. Use when creating, sending, or managing announcements.
---

# @jterrazz/broadcast

Part of the @jterrazz ecosystem. Defines how apps announce and distribute events.

Define an announcement once, send it to every channel: App Store In-App Events today, and any channel you implement. The manual is the package's `docs/` (`docs/README.md` maps it).

## Core model

```typescript
import { sendBroadcast, AppleAppStoreAdapter } from '@jterrazz/broadcast';

await sendBroadcast(
    {
        title: 'Breaking News', // max 30 chars
        shortDescription: 'Live coverage', // max 50 chars
        longDescription: 'Full details...', // max 120 chars
        badge: 'live-event', // challenge | competition | live-event | major-update | new-season | premiere | special-event
        audience: 'all', // all | new-users | active-users | lapsed-users
        priority: 'high', // normal | high

        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-07'),
        deepLink: 'myapp://events/123',
        cardImageUrl: 'https://...', // 16:9 landscape
        detailImageUrl: 'https://...', // 9:16 portrait
        territories: ['USA', 'FRA'],
    },
    [apple],
);
```

## Apple provider setup

```typescript
import { readFileSync } from 'node:fs';
import { AppleAppStoreAdapter } from '@jterrazz/broadcast';

const apple = new AppleAppStoreAdapter({
    issuerId: '...',
    keyId: '...',
    privateKey: readFileSync('./AuthKey.p8', 'utf-8'),
    appId: '...',
});
```

## Provider methods

```typescript
await apple.create(broadcast); // Create event + localization + images
await apple.list(); // List existing events
await apple.update('event-id', { priority: 'normal' });
await apple.delete('event-id');
```

## Multi-provider fan-out

`sendBroadcast` runs all providers concurrently and answers one result per provider, in order. One failing won't block others: its result is `failed`, its rejection as `raw`. Statuses: `created | submitted | approved | published | rejected | failed`. A refused App Store Connect call rejects with `AppleAppStoreError` (`statusCode`, `responseBody`); an image that cannot be uploaded rejects the create after the event exists.

## Always

- Apple requires both `cardImageUrl` (16:9) and `detailImageUrl` (9:16) for review submission
- Event dates must be in the future
- Max 15 approved events at a time on App Store Connect
- Implement `BroadcastProviderPort` interface for custom channels
