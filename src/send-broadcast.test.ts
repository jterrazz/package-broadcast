import { describe, expect, test, vi } from 'vitest';

import type { Broadcast, BroadcastProviderPort, BroadcastResult } from './ports/broadcast.port.js';
import { sendBroadcast } from './send-broadcast.js';

const makeBroadcast = (overrides?: Partial<Broadcast>): Broadcast => ({
    audience: 'all',
    badge: 'special-event',
    endDate: new Date('2026-04-15'),
    longDescription: 'Join us for a special live event with exclusive content.',
    priority: 'normal',
    shortDescription: 'Live event this weekend!',
    startDate: new Date('2026-04-01'),
    title: 'Spring Event',
    ...overrides,
});

const makeProvider = (name: string, result?: Partial<BroadcastResult>): BroadcastProviderPort => ({
    create: vi.fn().mockResolvedValue({
        id: 'provider-123',
        provider: name,
        status: 'created',
        ...result,
    }),
    delete: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    name,
    update: vi.fn(),
});

describe('sendBroadcast', () => {
    test('should send to a single provider', async () => {
        // Given - a single provider and a broadcast
        const provider = makeProvider('test-provider');
        const broadcast = makeBroadcast();

        // Then - the broadcast is sent and result matches the provider
        const results = await sendBroadcast(broadcast, [provider]);

        expect(results).toHaveLength(1);
        expect(results[0]?.provider).toBe('test-provider');
        expect(results[0]?.status).toBe('created');
        expect(provider.create).toHaveBeenCalledWith(broadcast);
    });

    test('should send to multiple providers concurrently', async () => {
        // Given - three providers with different names
        const providers = [makeProvider('alpha'), makeProvider('beta'), makeProvider('gamma')];
        const broadcast = makeBroadcast();

        // Then - every provider receives the broadcast, and the results keep their order
        const results = await sendBroadcast(broadcast, providers);

        expect(results).toHaveLength(3);
        expect(results.map((result) => result.provider)).toStrictEqual(['alpha', 'beta', 'gamma']);
    });

    test('should call every provider when one of three rejects', async () => {
        // Given - three providers, the middle one rejecting
        const alpha = makeProvider('alpha');
        const beta: BroadcastProviderPort = {
            create: vi.fn().mockRejectedValue(new Error('Network timeout')),
            delete: vi.fn(),
            list: vi.fn(),
            name: 'beta',
            update: vi.fn(),
        };
        const gamma = makeProvider('gamma');

        // Then - the fan-out reached all three, and only the rejection failed
        const results = await sendBroadcast(makeBroadcast(), [alpha, beta, gamma]);

        expect(results.map((result) => result.status)).toStrictEqual([
            'created',
            'failed',
            'created',
        ]);
        expect(alpha.create).toHaveBeenCalledOnce();
        expect(beta.create).toHaveBeenCalledOnce();
        expect(gamma.create).toHaveBeenCalledOnce();
    });

    test('should handle provider failures gracefully', async () => {
        // Given - one working provider and one that rejects
        const successProvider = makeProvider('apple');
        const failProvider: BroadcastProviderPort = {
            create: vi.fn().mockRejectedValue(new Error('API down')),
            delete: vi.fn(),
            list: vi.fn(),
            name: 'broken',
            update: vi.fn(),
        };

        // Then - the failed provider returns a "failed" status
        const results = await sendBroadcast(makeBroadcast(), [successProvider, failProvider]);

        expect(results).toHaveLength(2);
        expect(results[0]?.status).toBe('created');
        expect(results[1]?.status).toBe('failed');
        expect(results[1]?.provider).toBe('broken');
    });

    test('should return empty array for empty providers', async () => {
        // Given - no providers
        const broadcast = makeBroadcast();

        // Then - empty results
        const results = await sendBroadcast(broadcast, []);

        expect(results).toHaveLength(0);
    });

    test('should handle all providers failing', async () => {
        // Given - two failing providers
        const fail1: BroadcastProviderPort = {
            create: vi.fn().mockRejectedValue(new Error('Error 1')),
            delete: vi.fn(),
            list: vi.fn(),
            name: 'fail-1',
            update: vi.fn(),
        };
        const fail2: BroadcastProviderPort = {
            create: vi.fn().mockRejectedValue(new Error('Error 2')),
            delete: vi.fn(),
            list: vi.fn(),
            name: 'fail-2',
            update: vi.fn(),
        };

        // Then - all results are failed
        const results = await sendBroadcast(makeBroadcast(), [fail1, fail2]);

        expect(results.map((result) => result.status)).toStrictEqual(['failed', 'failed']);
    });

    test('should include error in raw field on failure', async () => {
        // Given - a provider that throws with a message
        const failProvider: BroadcastProviderPort = {
            create: vi.fn().mockRejectedValue(new Error('Network timeout')),
            delete: vi.fn(),
            list: vi.fn(),
            name: 'broken',
            update: vi.fn(),
        };

        // Then - raw field contains the error
        const results = await sendBroadcast(makeBroadcast(), [failProvider]);

        expect(results[0]?.raw).toBeInstanceOf(Error);
        expect(results[0]?.raw).toMatchObject({ message: 'Network timeout' });
    });
});
