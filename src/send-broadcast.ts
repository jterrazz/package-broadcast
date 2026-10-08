import type { Broadcast, BroadcastProviderPort, BroadcastResult } from './ports/broadcast.port.js';

/** Sends a broadcast to every provider at once, answering one result per provider in their order, a rejection as `failed`. */
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
