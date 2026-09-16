import type { Broadcast, BroadcastProviderPort, BroadcastResult } from './ports/broadcast.port.js';

/**
 * Send a broadcast to one or more providers concurrently.
 * Returns a result per provider, including failures.
 */
export async function sendBroadcast(
    broadcast: Broadcast,
    providers: BroadcastProviderPort[],
): Promise<BroadcastResult[]> {
    return await Promise.all(
        providers.map(async (provider): Promise<BroadcastResult> => {
            try {
                return await provider.create(broadcast);
            } catch (error: unknown) {
                return {
                    id: '',
                    provider: provider.name,
                    raw: error,
                    status: 'failed',
                };
            }
        }),
    );
}
