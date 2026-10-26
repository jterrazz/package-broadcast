# @jterrazz/broadcast

Multi-channel broadcast system for distributing announcements across platforms. Define an announcement once, send it everywhere: App Store In-App Events today, and any channel you implement.

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
    privateKey: '-----BEGIN PRIVATE KEY-----\n...', // example: the .p8 App Store Connect issued
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

`sendBroadcast` fans out to all providers concurrently. If one fails, the others still succeed: each result carries a `status`, `failed` for a channel that rejected.

## Documentation

The manual lives in [`docs/`](docs/README.md), cut by what the reader came to do:

- [Architecture](docs/concepts/architecture.md): the ports, the core and the adapters, and the fan-out.
- [Apple App Store](docs/reference/apple-app-store.md): the credentials, what each call sends, the field mapping, Apple's limits.
- [Write a channel](docs/guides/write-a-channel.md): a channel of your own, or one this package ships.
- [Develop](docs/guides/develop.md), [Test](docs/guides/test.md), [Release](docs/guides/release.md): changing, proving and publishing the package.

For agents: the [`skills/studio-broadcast`](skills/studio-broadcast/SKILL.md) Claude Code skill routes into the manual.

## Development

```bash
make install    # npm ci
make check      # lint, specs, mutation: the gate before a commit
```

The gestures and what each runs are [Develop § The gestures](docs/guides/develop.md#the-gestures)'s.
