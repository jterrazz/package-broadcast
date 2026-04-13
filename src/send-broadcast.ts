import type { Broadcast, BroadcastProviderPort, BroadcastResult } from './ports/broadcast.port.js';

/**
 * Send a broadcast to one or more providers concurrently.
 * Returns a result per provider, including failures.
 */
export async function sendBroadcast(
    broadcast: Broadcast,
    providers: BroadcastProviderPort[],
): Promise<BroadcastResult[]> {
    const results = await Promise.allSettled(
        providers.map((provider) => provider.create(broadcast)),
    );

    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        }

        return {
            id: '',
            provider: providers[index].name,
            raw: result.reason,
            status: 'failed' as const,
        };
    });
}
