import { describe, expect, test } from 'vitest';

import { AppleAppStoreAdapter } from '../../../src/index.js';
import { APP } from '../__setup__/app-store-connect.js';
import { listing } from '../__setup__/stubs/app-store.stubs.js';
import { integration } from '../integration.specification.js';

describe('list', () => {
    test('reads every event state of the app as the status it means', async () => {
        // Given - the app holding one event in each state App Store Connect reports, and one it may add
        const result = await integration
            .intercept(
                listing([
                    'DRAFT',
                    'WAITING_FOR_REVIEW',
                    'APPROVED',
                    'ACCEPTED',
                    'PUBLISHED',
                    'PAST',
                    'REJECTED',
                    'ARCHIVED',
                ]),
            )
            .call(
                async () =>
                    await new AppleAppStoreAdapter(APP)
                        .list()
                        .then((events) => events.map(({ id, status }) => ({ id, status }))),
            );

        // Then - each event is listed in order under its status, an unknown state read as created
        expect(result.value).toMatch([
            { id: 'event-1', status: 'created' },
            { id: 'event-2', status: 'submitted' },
            { id: 'event-3', status: 'approved' },
            { id: 'event-4', status: 'approved' },
            { id: 'event-5', status: 'published' },
            { id: 'event-6', status: 'published' },
            { id: 'event-7', status: 'rejected' },
            { id: 'event-8', status: 'created' },
        ]);
    });

    test('keeps the event App Store Connect answered as the raw of its result', async () => {
        // Given - the app holding one published event
        const result = await integration
            .intercept(listing(['PUBLISHED']))
            .call(async () => await new AppleAppStoreAdapter(APP).list());

        // Then - the result carries the provider and the event as Apple wrote it
        expect(result.value).toMatch([
            {
                id: 'event-1',
                provider: 'apple-app-store',
                raw: {
                    attributes: {
                        badge: 'LIVE_EVENT',
                        eventState: 'PUBLISHED',
                        referenceName: 'Event 1',
                    },
                    id: 'event-1',
                    type: 'appEvents',
                },
                status: 'published',
            },
        ]);
    });

    test('lists nothing for an app with no event', async () => {
        // Given - the app holding no event
        const result = await integration
            .intercept(listing([]))
            .call(async () => await new AppleAppStoreAdapter(APP).list());

        // Then - the list is empty
        expect(result.value).toMatch([]);
    });
});
