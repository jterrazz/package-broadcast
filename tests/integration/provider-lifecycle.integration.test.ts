import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
    AppleAppStoreAdapter,
    type Broadcast,
    type BroadcastProviderPort,
    type BroadcastResult,
    sendBroadcast,
} from '../../src/index.js';

// Mock the JWT generation to avoid needing a real private key
vi.mock('../../src/adapters/apple/apple-auth.js', () => ({
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

function mockResponse(
    status: number,
    body: unknown,
    noContent = false,
    textBody?: string,
): Response {
    const ok = status >= 200 && status < 300;
    return {
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: () => Promise.resolve(body),
        ok,
        status,
        statusText: ok ? 'OK' : 'Error',
        text: () => Promise.resolve(textBody ?? JSON.stringify(body)),
    } as Response;
}

describe('Provider lifecycle', () => {
    let adapter: AppleAppStoreAdapter;
    let fetchSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        adapter = new AppleAppStoreAdapter(TEST_CONFIG);
        fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('creates and lists an event', async () => {
        // Given — mock responses for create (event + localization) and list
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

        const createResult = await adapter.create(makeBroadcast());
        const listResults = await adapter.list();

        // Then — the created event appears in the list
        expect(createResult.id).toBe('event-1');
        expect(createResult.status).toBe('created');
        expect(listResults).toHaveLength(1);
        expect(listResults[0].id).toBe('event-1');
        expect(listResults[0].status).toBe('created');
    });

    test('creates, updates, then deletes an event', async () => {
        // Given — mock responses for create, localization, update, and delete
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
        fetchSpy.mockResolvedValueOnce(mockResponse(204, null, true));

        const createResult = await adapter.create(makeBroadcast());
        const updateResult = await adapter.update(createResult.id, { priority: 'high' });
        await adapter.delete(createResult.id);

        // Then — all three API calls were made with the correct HTTP methods
        expect(fetchSpy).toHaveBeenCalledTimes(4); // Create event + localization + update + delete
        expect(fetchSpy.mock.calls[0][1].method).toBe('POST');
        expect(fetchSpy.mock.calls[1][1].method).toBe('POST');
        expect(fetchSpy.mock.calls[2][1].method).toBe('PATCH');
        expect(fetchSpy.mock.calls[3][1].method).toBe('DELETE');

        expect(createResult.id).toBe('event-1');
        expect(updateResult.id).toBe('event-1');

        const updateBody = JSON.parse(fetchSpy.mock.calls[2][1].body);
        expect(updateBody.data.attributes.priority).toBe('HIGH');
    });

    test('handles create failure then retries successfully', async () => {
        // Given — first create returns 500, second create returns 201
        fetchSpy.mockResolvedValueOnce(
            mockResponse(500, null, false, '{"errors":[{"detail":"Internal Server Error"}]}'),
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

        const firstAttempt = await adapter.create(makeBroadcast()).catch((error: unknown) => error);
        const secondAttempt = await adapter.create(makeBroadcast());

        // Then — the first attempt fails and the second succeeds
        expect(firstAttempt).toBeInstanceOf(Error);
        expect(secondAttempt.id).toBe('event-1');
        expect(secondAttempt.status).toBe('created');
        expect(fetchSpy).toHaveBeenCalledTimes(3);
    });
});

describe('Multi-provider fan-out', () => {
    let fetchSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('sends to three providers with mixed results', async () => {
        // Given — three mock providers: one succeeds, one fails, one succeeds
        const providerA: BroadcastProviderPort = {
            create: vi.fn().mockResolvedValue({ id: 'a-1', provider: 'alpha', status: 'created' }),
            delete: vi.fn(),
            list: vi.fn(),
            name: 'alpha',
            update: vi.fn(),
        };

        const providerB: BroadcastProviderPort = {
            create: vi.fn().mockRejectedValue(new Error('Network timeout')),
            delete: vi.fn(),
            list: vi.fn(),
            name: 'beta',
            update: vi.fn(),
        };

        const providerC: BroadcastProviderPort = {
            create: vi.fn().mockResolvedValue({ id: 'c-1', provider: 'gamma', status: 'created' }),
            delete: vi.fn(),
            list: vi.fn(),
            name: 'gamma',
            update: vi.fn(),
        };

        const results = await sendBroadcast(makeBroadcast(), [providerA, providerB, providerC]);

        // Then — two succeed and one fails, all three providers were called
        const created = results.filter((r) => r.status === 'created');
        const failed = results.filter((r) => r.status === 'failed');

        expect(created).toHaveLength(2);
        expect(failed).toHaveLength(1);
        expect(failed[0].provider).toBe('beta');

        expect(providerA.create).toHaveBeenCalledTimes(1);
        expect(providerB.create).toHaveBeenCalledTimes(1);
        expect(providerC.create).toHaveBeenCalledTimes(1);
    });

    test('preserves provider order in results', async () => {
        // Given — three providers named alpha, beta, gamma
        const makeProvider = (name: string): BroadcastProviderPort => ({
            create: vi.fn().mockResolvedValue({
                id: `${name}-1`,
                provider: name,
                status: 'created',
            } as BroadcastResult),
            delete: vi.fn(),
            list: vi.fn(),
            name,
            update: vi.fn(),
        });

        const providers = [makeProvider('alpha'), makeProvider('beta'), makeProvider('gamma')];

        const results = await sendBroadcast(makeBroadcast(), providers);

        // Then — results array preserves the same order as the input providers
        expect(results).toHaveLength(3);
        expect(results[0].provider).toBe('alpha');
        expect(results[1].provider).toBe('beta');
        expect(results[2].provider).toBe('gamma');
    });
});
