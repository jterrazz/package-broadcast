# Write a channel

A channel is one implementation of `BroadcastProviderPort` ([Architecture](../concepts/architecture.md#the-port)): a `name`, and `create`, `update`, `delete`, `list`. A consumer writes one in its own code; a channel the package ships lives here. Both take the same shape.

## In a consumer's code

Implement the port and hand an instance to `sendBroadcast` beside, or instead of, the built-in channels. Nothing in the core or the port needs to know it exists:

```ts
import type { Broadcast, BroadcastProviderPort, BroadcastResult } from '@jterrazz/broadcast';

class SlackChannel implements BroadcastProviderPort {
    readonly name = 'slack';

    async create(broadcast: Broadcast): Promise<BroadcastResult> {
        const id = await postToWebhook(broadcast);
        return { id, provider: this.name, status: 'published' };
    }

    async update(id: string, broadcast: Partial<Broadcast>): Promise<BroadcastResult> {
        /* ... */
    }

    async delete(id: string): Promise<void> {
        /* ... */
    }

    async list(): Promise<BroadcastResult[]> {
        /* ... */
    }
}
```

A rejection from `create` is the channel's own business: `sendBroadcast` turns it into a `failed` result carrying the rejection as `raw`, and the other channels still run.

## Shipped by this package

A channel the package ships is a directory under `src/adapters/<channel>/`, exported from `src/index.ts`: the adapter class in `<channel>.adapter.ts`, its errors and its authentication in files of their own, as `apple/` holds them. It is proven by its own specs under `specs/integration/<channel>/`, against stubs of the channel's API declared in `specs/integration/__setup__/stubs/` ([Test](test.md)), and documented by a page of its own in `reference/`, as [Apple App Store](../reference/apple-app-store.md) is.

## Planned

Not implemented today, and no directory exists for any of them yet: Google Play promotional events, push notifications (APNs and FCM), email digests, and a JSON endpoint for in-app banners on the web and desktop apps.
