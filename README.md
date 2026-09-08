# @jterrazz/broadcast

Multi-channel broadcast system for distributing announcements across platforms. Define an announcement once, send it everywhere — App Store In-App Events, Google Play, push notifications, email, and more.

## Install

```bash
npm install @jterrazz/broadcast
```

## Quick start

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

## Documentation

The full corpus lives in [`docs/`](docs/):

- [Architecture](docs/01-architecture.md) — the ports/core/adapters layers and the fan-out.
- [Developing](docs/02-developing.md) — the toolchain and where a change opens a file.
- [Testing](docs/03-testing.md) — the unit and integration suites.
- [Operating](docs/04-operating.md) — what publishes this package, and what a merge does not do.
- [Channels](docs/05-channels.md) — the provider port, the Apple App Store channel, and what's planned.

For agents: read the chapters straight from the repo, plus the [`skills/jterrazz-broadcast`](skills/jterrazz-broadcast/SKILL.md) Claude Code skill.

## Development

```bash
npm install
npm test        # Run tests (vitest)
npm run build   # Build ESM + CJS (rolldown)
npm run lint    # Type check + oxlint + oxfmt
```
