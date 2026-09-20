import { expect, test, vi } from 'vitest';

import { AppleAppStoreAdapter } from '../../../src/index.js';
import type { Broadcast } from '../../../src/index.js';
import { integration } from '../integration.specification.js';

// Mock the JWT generation to avoid needing a real private key
vi.mock(import('../../../src/adapters/apple/apple-authentication.js'), () => ({
    createAppleJwt: vi.fn().mockResolvedValue('mock-jwt-token'),
}));

const TEST_CONFIG = {
    appId: '6444444444',
    issuerId: 'test-issuer',
    keyId: 'TEST_KEY',
    privateKey: 'not-used-because-mocked',
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

/** A real `Response`, so the adapter reads the object a `fetch` would have handed it. */
function mockResponse(status: number, body: unknown, textBody?: string): Response {
    const ok = status >= 200 && status < 300;

    return new Response(status === 204 ? null : (textBody ?? JSON.stringify(body)), {
        headers: { 'Content-Type': 'application/json' },
        status,
        statusText: ok ? 'OK' : 'Error',
    });
}

test('creates and lists an event', async () => {
    // Given - an App Store Connect that accepts the event, its localization, then a listing
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    fetchSpy.mockResolvedValueOnce(
        mockResponse(201, {
            data: {
                attributes: { badge: 'SPECIAL_EVENT', eventState: 'DRAFT' },
                id: 'event-1',
                type: 'appEvents',
            },
        }),
    );
    fetchSpy.mockResolvedValueOnce(
        mockResponse(201, {
            data: {
                attributes: { locale: 'en-US', name: 'Spring Event' },
                id: 'loc-1',
                type: 'appEventLocalizations',
            },
        }),
    );
    fetchSpy.mockResolvedValueOnce(
        mockResponse(200, {
            data: [
                {
                    attributes: {
                        badge: 'SPECIAL_EVENT',
                        eventState: 'DRAFT',
                        referenceName: 'Spring Event',
                    },
                    id: 'event-1',
                    type: 'appEvents',
                },
            ],
        }),
    );

    const result = await integration.call(async () => {
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
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe('event-1');
    expect(listed[0]?.status).toBe('created');
});

test('creates, updates, then deletes an event', async () => {
    // Given - an App Store Connect that accepts create, localization, update and delete
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    fetchSpy.mockResolvedValueOnce(
        mockResponse(201, {
            data: {
                attributes: { badge: 'SPECIAL_EVENT', eventState: 'DRAFT' },
                id: 'event-1',
                type: 'appEvents',
            },
        }),
    );
    fetchSpy.mockResolvedValueOnce(
        mockResponse(201, {
            data: { id: 'loc-1', type: 'appEventLocalizations' },
        }),
    );
    fetchSpy.mockResolvedValueOnce(
        mockResponse(200, {
            data: {
                attributes: { badge: 'SPECIAL_EVENT', eventState: 'DRAFT' },
                id: 'event-1',
                type: 'appEvents',
            },
        }),
    );
    fetchSpy.mockResolvedValueOnce(mockResponse(204, null));

    const result = await integration.call(async () => {
        const adapter = new AppleAppStoreAdapter(TEST_CONFIG);
        const created = await adapter.create(makeBroadcast());
        const updated = await adapter.update(created.id, { priority: 'high' });
        await adapter.delete(created.id);

        return { created, updated };
    });

    // Then - the pipeline ran in order: create event, localization, update, delete
    expect(fetchSpy).toHaveBeenCalledTimes(4);
    expect(fetchSpy.mock.calls[0]?.[1].method).toBe('POST');
    expect(fetchSpy.mock.calls[1]?.[1].method).toBe('POST');
    expect(fetchSpy.mock.calls[2]?.[1].method).toBe('PATCH');
    expect(fetchSpy.mock.calls[3]?.[1].method).toBe('DELETE');

    const { created, updated } = result.value.value;
    expect(created.id).toBe('event-1');
    expect(updated.id).toBe('event-1');

    const updateBody = JSON.parse(fetchSpy.mock.calls[2]?.[1].body);
    expect(updateBody.data.attributes.priority).toBe('HIGH');
});

test('handles create failure then retries successfully', async () => {
    // Given - an App Store Connect that refuses the first event and accepts the second
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    fetchSpy.mockResolvedValueOnce(
        mockResponse(500, null, '{"errors":[{"detail":"Internal Server Error"}]}'),
    );
    fetchSpy.mockResolvedValueOnce(
        mockResponse(201, {
            data: {
                attributes: { badge: 'SPECIAL_EVENT', eventState: 'DRAFT' },
                id: 'event-1',
                type: 'appEvents',
            },
        }),
    );
    fetchSpy.mockResolvedValueOnce(
        mockResponse(201, {
            data: { id: 'loc-1', type: 'appEventLocalizations' },
        }),
    );

    const refused = await integration.call(
        async () => await new AppleAppStoreAdapter(TEST_CONFIG).create(makeBroadcast()),
    );
    const retried = await integration.call(
        async () => await new AppleAppStoreAdapter(TEST_CONFIG).create(makeBroadcast()),
    );

    // Then - the first attempt was refused and the retry went through
    expect(refused.error.text).toBe('App Store Connect API error: 500 Error');
    expect(retried.value.value.id).toBe('event-1');
    expect(retried.value.value.status).toBe('created');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
});
