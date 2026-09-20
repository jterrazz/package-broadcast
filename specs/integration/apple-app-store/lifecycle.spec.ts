import { expect, test } from 'vitest';

import { SAMPLE_PRIVATE_KEY } from '../../../src/adapters/apple/apple-authentication.fixtures.js';
import { AppleAppStoreAdapter } from '../../../src/index.js';
import type { Broadcast } from '../../../src/index.js';
import { integration } from '../integration.specification.js';
import {
    withFirstAttemptRefused,
    withListing,
    withUpdateAndDelete,
} from './contracts/app-store.contracts.js';

const TEST_CONFIG = {
    appId: '6444444444',
    issuerId: 'test-issuer',
    keyId: 'TEST_KEY',
    privateKey: SAMPLE_PRIVATE_KEY,
};

const makeBroadcast = (overrides?: Partial<Broadcast>): Broadcast => ({
    audience: 'all',
    badge: 'special-event',
    deepLink: 'signews://events/spring-2026',
    endDate: new Date('2026-04-15T00:00:00.000Z'),
    longDescription: 'Join us for a special live event with exclusive content and prizes.',
    priority: 'normal',
    shortDescription: 'Live event this weekend!',
    startDate: new Date('2026-04-01T00:00:00.000Z'),
    title: 'Spring Event',
    ...overrides,
});

test('creates and lists an event', async () => {
    // Given - an App Store Connect that takes the event, its localization, then lists it
    const result = await integration.intercept(withListing).call(async () => {
        const adapter = new AppleAppStoreAdapter(TEST_CONFIG);

        return {
            created: await adapter.create(makeBroadcast()),
            listed: await adapter.list(),
        };
    });

    // Then - the created event appears in the list
    const { created, listed } = result.value.value;
    expect(created.id).toBe('event-1');
    expect(created.status).toBe('created');
    expect(listed.map(({ id, status }) => ({ id, status }))).toStrictEqual([
        { id: 'event-1', status: 'created' },
    ]);
});

test('creates, updates, then deletes an event', async () => {
    // Given - an App Store Connect that takes create, localization, patch and delete
    const result = await integration.intercept(withUpdateAndDelete).call(async () => {
        const adapter = new AppleAppStoreAdapter(TEST_CONFIG);
        const created = await adapter.create(makeBroadcast());
        const updated = await adapter.update(created.id, { priority: 'high' });
        await adapter.delete(created.id);

        return { created, updated };
    });

    // Then - every declared call was made, on the event the create named
    const { created, updated } = result.value.value;
    expect(created.id).toBe('event-1');
    expect(updated.id).toBe('event-1');
});

test('handles create failure then retries successfully', async () => {
    // Given - an App Store Connect that fails the first event and accepts the second
    const result = await integration.intercept(withFirstAttemptRefused).call(async () => {
        const adapter = new AppleAppStoreAdapter(TEST_CONFIG);
        const refusal = await adapter.create(makeBroadcast()).catch(String);

        return { refusal, retried: await adapter.create(makeBroadcast()) };
    });

    // Then - the first attempt was refused and the retry went through
    const { refusal, retried } = result.value.value;
    expect(refusal).toBe(
        'AppleAppStoreError: App Store Connect API error: 500 Internal Server Error',
    );
    expect(retried).toMatchObject({ id: 'event-1', status: 'created' });
});
