import { defineStubs } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { AppleAppStoreAdapter, sendBroadcast } from '../../../src/index.js';
import type { BroadcastProviderPort } from '../../../src/index.js';
import { APP, springEvent } from '../__setup__/app-store-connect.js';
import { appStore, refusingApp } from '../__setup__/stubs/app-store.stubs.js';
import { integration } from '../integration.specification.js';

const banner: BroadcastProviderPort = {
    create: async (broadcast) =>
        await Promise.resolve({
            id: `banner-${broadcast.title}`,
            provider: 'in-app-banner',
            status: 'published',
        }),
    delete: async () => {
        await Promise.resolve();
    },
    list: async () => await Promise.resolve([]),
    name: 'in-app-banner',
    update: async (id) =>
        await Promise.resolve({ id, provider: 'in-app-banner', status: 'published' }),
};

describe('fan-out', () => {
    test('answers one result per channel, in order, a refused channel failing alone', async () => {
        // Given - one app App Store Connect takes the event of, a second it refuses, and the consumer's own banner
        const result = await integration
            .intercept(defineStubs(appStore, refusingApp('7000000000')))
            .call(
                async () =>
                    await sendBroadcast(springEvent(), [
                        new AppleAppStoreAdapter(APP),
                        new AppleAppStoreAdapter({ ...APP, appId: '7000000000' }),
                        banner,
                    ]),
            );

        // Then - the first created, the second failed with Apple's refusal as its raw, the banner published
        expect(result.value).toMatch([
            {
                id: 'event-1',
                provider: 'apple-app-store',
                raw: {
                    data: {
                        attributes: { badge: 'SPECIAL_EVENT', eventState: 'DRAFT' },
                        id: 'event-1',
                        type: 'appEvents',
                    },
                },
                status: 'created',
            },
            {
                id: '',
                provider: 'apple-app-store',
                raw: {
                    name: 'AppleAppStoreError',
                    responseBody:
                        '{"errors":[{"code":"ENTITY_ERROR.ATTRIBUTE.INVALID","detail":"deepLink is invalid"}]}',
                    statusCode: 422,
                },
                status: 'failed',
            },
            { id: 'banner-Spring Event', provider: 'in-app-banner', status: 'published' },
        ]);
    });

    test('answers nothing for no channel', async () => {
        // Given - a broadcast sent to no channel
        const result = await integration.call(async () => await sendBroadcast(springEvent(), []));

        // Then - there is no result
        expect(result.value).toMatch([]);
    });
});
