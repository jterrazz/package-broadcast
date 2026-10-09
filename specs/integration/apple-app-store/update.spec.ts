import { describe, expect, test } from 'vitest';

import { AppleAppStoreAdapter } from '../../../src/index.js';
import { APP } from '../__setup__/app-store-connect.js';
import { updating } from '../__setup__/stubs/app-store.stubs.js';
import { integration } from '../integration.specification.js';

const patched = (attributes: object) => ({
    id: 'event-1',
    provider: 'apple-app-store',
    raw: {
        data: {
            attributes: { badge: 'SPECIAL_EVENT', eventState: 'WAITING_FOR_REVIEW' },
            id: 'event-1',
            type: 'appEvents',
        },
        received: { data: { attributes, id: 'event-1', type: 'appEvents' } },
    },
    status: 'submitted',
});

describe('update', () => {
    test('patches every field the event can change, in Apple’s spelling', async () => {
        // Given - an App Store Connect taking a patch of the event
        const result = await integration.intercept(updating).call(
            async () =>
                await new AppleAppStoreAdapter(APP).update('event-1', {
                    audience: 'new-users',
                    deepLink: 'signews://events/updated',
                    priority: 'high',
                    requiresPurchase: true,
                }),
        );

        // Then - the patch carried the four, and the event now waits for review
        expect(result.value).toMatch(
            patched({
                deepLink: 'signews://events/updated',
                priority: 'HIGH',
                purchaseRequirement: 'IN_APP_PURCHASE',
                purpose: 'ATTRACT_NEW_USERS',
            }),
        );
    });

    test('patches the lower settings of priority and purchase', async () => {
        // Given - an App Store Connect taking a patch of the event
        const result = await integration.intercept(updating).call(
            async () =>
                await new AppleAppStoreAdapter(APP).update('event-1', {
                    priority: 'normal',
                    requiresPurchase: false,
                }),
        );

        // Then - the patch carried normal priority and no cost
        expect(result.value).toMatch(
            patched({ priority: 'NORMAL', purchaseRequirement: 'NO_COST_ASSOCIATED' }),
        );
    });

    test('patches nothing the caller left out', async () => {
        // Given - an App Store Connect taking a patch of the event
        const result = await integration
            .intercept(updating)
            .call(async () => await new AppleAppStoreAdapter(APP).update('event-1', {}));

        // Then - the patch carried no attribute
        expect(result.value).toMatch(patched({}));
    });
});
