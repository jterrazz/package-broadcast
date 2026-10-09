import { AppleAppStoreAdapter, AppleAppStoreError, createAppleJwt, sendBroadcast } from '@jterrazz/broadcast';
import type {
    AppleAppStoreConfig,
    AppleAuthConfig,
    Broadcast,
    BroadcastProviderPort,
    BroadcastResult,
} from '@jterrazz/broadcast';

const key: AppleAuthConfig = { issuerId: 'issuer', keyId: 'KEY', privateKey: 'pem' };
const config: AppleAppStoreConfig = { ...key, appId: '6444444444' };

const banner: BroadcastProviderPort = {
    create: async (broadcast: Broadcast): Promise<BroadcastResult> => ({
        id: broadcast.title,
        provider: 'in-app-banner',
        status: 'published',
    }),
    delete: async (): Promise<void> => {},
    list: async (): Promise<BroadcastResult[]> => [],
    name: 'in-app-banner',
    update: async (id: string): Promise<BroadcastResult> => ({
        id,
        provider: 'in-app-banner',
        status: 'submitted',
    }),
};

const broadcast: Broadcast = {
    audience: 'lapsed-users',
    badge: 'new-season',
    endDate: new Date('2026-04-30'),
    longDescription: 'Explore new game modes, leaderboards, and exclusive rewards.',
    priority: 'high',
    shortDescription: 'New features and challenges await',
    startDate: new Date('2026-04-01'),
    title: 'Season 2 is live!',
};

const results: BroadcastResult[] = await sendBroadcast(broadcast, [
    new AppleAppStoreAdapter(config),
    banner,
]);
const token: string = await createAppleJwt(key);
const refusal = new AppleAppStoreError('refused', 422, '{}');
const status: number = refusal.statusCode;
const body: string = refusal.responseBody;

// @ts-expect-error -- a badge App Store Connect does not know is refused
const unknown: Broadcast = { ...broadcast, badge: 'flash-sale' };

export { body, results, status, token, unknown };
