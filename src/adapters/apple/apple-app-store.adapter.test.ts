import { defineContracts, http, intercept } from '@jterrazz/test';
import type { InterceptScope } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import type { Broadcast } from '../../ports/broadcast.port.js';
import { AppleAppStoreAdapter } from './apple-app-store.adapter.js';
import { AppleAppStoreError } from './apple-app-store.error.js';
import { SAMPLE_PRIVATE_KEY } from './apple-authentication.fixtures.js';

const BASE_URL = 'https://api.appstoreconnect.apple.com/v1';

const TEST_CONFIG = {
    appId: '6444444444',
    issuerId: 'test-issuer',
    keyId: 'TEST_KEY',
    privateKey: SAMPLE_PRIVATE_KEY,
};

const adapter = new AppleAppStoreAdapter(TEST_CONFIG);

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

/** The event Apple answers a create with, in the shape the adapter reads. */
const CREATED_EVENT = {
    data: {
        attributes: { badge: 'SPECIAL_EVENT', eventState: 'DRAFT' },
        id: 'event-123',
        type: 'appEvents',
    },
};

/** The localization Apple answers with, once the event exists. */
const CREATED_LOCALIZATION = { data: { id: 'loc-456', type: 'appEventLocalizations' } };

/**
 * Apple accepting an event and its localization — the two calls every create
 * makes. The filter is the assertion: a request the declared event does not
 * describe matches nothing, and an unmatched call fails the block.
 */
async function appleAcceptsCreate(event?: object): Promise<InterceptScope> {
    return await intercept(
        defineContracts(
            {
                request: http.post(
                    `${BASE_URL}/appEvents`,
                    event === undefined ? {} : { body: event },
                ),
                response: http.json(CREATED_EVENT, { status: 201 }),
            },
            {
                request: http.post(`${BASE_URL}/appEventLocalizations`),
                response: http.json(CREATED_LOCALIZATION, { status: 201 }),
            },
        ),
    );
}

describe('appleAppStoreAdapter create', () => {
    test('should create an event and its localization', async () => {
        // Given - an Apple that accepts exactly the event and localization this broadcast describes
        await using _ = await intercept(
            defineContracts(
                {
                    request: http.post(`${BASE_URL}/appEvents`, {
                        body: {
                            data: {
                                attributes: {
                                    badge: 'SPECIAL_EVENT',
                                    deepLink: 'signews://events/spring-2026',
                                    primaryLocale: 'en-US',
                                    priority: 'NORMAL',
                                    purchaseRequirement: 'NO_COST_ASSOCIATED',
                                    purpose: 'APPROPRIATE_FOR_ALL_USERS',
                                    referenceName: 'Spring Event',
                                },
                                relationships: { app: { data: { id: '6444444444' } } },
                                type: 'appEvents',
                            },
                        },
                    }),
                    response: http.json(CREATED_EVENT, { status: 201 }),
                },
                {
                    request: http.post(`${BASE_URL}/appEventLocalizations`, {
                        body: {
                            data: {
                                attributes: {
                                    locale: 'en-US',
                                    longDescription:
                                        'Join us for a special live event with exclusive content and prizes.',
                                    name: 'Spring Event',
                                    shortDescription: 'Live event this weekend!',
                                },
                                relationships: { appEvent: { data: { id: 'event-123' } } },
                                type: 'appEventLocalizations',
                            },
                        },
                    }),
                    response: http.json(CREATED_LOCALIZATION, { status: 201 }),
                },
            ),
        );

        // Then - the localization carried the id the event creation answered with
        const result = await adapter.create(makeBroadcast());

        expect(result).toStrictEqual({
            id: 'event-123',
            provider: 'apple-app-store',
            raw: CREATED_EVENT,
            status: 'created',
        });
    });

    test('should send authorization header with JWT', async () => {
        // Given - an Apple that answers only a request bearing a signed three-part token
        await using _ = await intercept(
            defineContracts(
                {
                    request: http.post(`${BASE_URL}/appEvents`, {
                        headers: {
                            authorization: /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/u,
                            'content-type': 'application/json',
                        },
                    }),
                    response: http.json(CREATED_EVENT, { status: 201 }),
                },
                {
                    request: http.post(`${BASE_URL}/appEventLocalizations`),
                    response: http.json(CREATED_LOCALIZATION, { status: 201 }),
                },
            ),
        );

        // Then - the create went through, which only a matching token allows
        const result = await adapter.create(makeBroadcast());

        expect(result.status).toBe('created');
    });

    test('should map high priority correctly', async () => {
        // Given - an Apple that accepts the event only when its priority reads HIGH
        await using _ = await appleAcceptsCreate({
            data: { attributes: { priority: 'HIGH' } },
        });

        // Then - the create went through
        const result = await adapter.create(makeBroadcast({ priority: 'high' }));

        expect(result.status).toBe('created');
    });

    test.each([
        ['challenge', 'CHALLENGE'],
        ['competition', 'COMPETITION'],
        ['live-event', 'LIVE_EVENT'],
        ['major-update', 'MAJOR_UPDATE'],
        ['new-season', 'NEW_SEASON'],
        ['premiere', 'PREMIERE'],
        ['special-event', 'SPECIAL_EVENT'],
    ] as const)('should map the %s badge to %s', async (input, expected) => {
        // Given - an Apple that accepts the event only under that spelling of the badge
        await using _ = await appleAcceptsCreate({ data: { attributes: { badge: expected } } });

        // Then - the badge reached Apple under its own spelling
        const result = await adapter.create(makeBroadcast({ badge: input }));

        expect(result.status).toBe('created');
    });

    test.each([
        ['all', 'APPROPRIATE_FOR_ALL_USERS'],
        ['active-users', 'APPROPRIATE_FOR_ALL_USERS'],
        ['new-users', 'ATTRACT_NEW_USERS'],
        ['lapsed-users', 'ATTRACT_LAPSED_USERS'],
    ] as const)('should map the %s audience to %s', async (input, expected) => {
        // Given - an Apple that accepts the event only under that purpose
        await using _ = await appleAcceptsCreate({
            data: { attributes: { purpose: expected } },
        });

        // Then - the audience reached Apple as a purpose
        const result = await adapter.create(makeBroadcast({ audience: input }));

        expect(result.status).toBe('created');
    });

    test('should map requiresPurchase to IN_APP_PURCHASE', async () => {
        // Given - an Apple that accepts the event only when a purchase is required
        await using _ = await appleAcceptsCreate({
            data: { attributes: { purchaseRequirement: 'IN_APP_PURCHASE' } },
        });

        // Then - the create went through
        const result = await adapter.create(makeBroadcast({ requiresPurchase: true }));

        expect(result.status).toBe('created');
    });

    test('should build territory schedules with dates', async () => {
        // Given - an Apple that accepts the event only with both territories and both dates
        await using _ = await appleAcceptsCreate({
            data: {
                attributes: {
                    territorySchedules: [
                        {
                            eventEnd: '2026-04-15T00:00:00.000Z',
                            eventStart: '2026-04-01T00:00:00.000Z',
                            publishStart: '2026-04-01T00:00:00.000Z',
                            territories: ['USA', 'FRA'],
                        },
                    ],
                },
            },
        });

        // Then - the create went through
        const result = await adapter.create(makeBroadcast({ territories: ['USA', 'FRA'] }));

        expect(result.status).toBe('created');
    });

    test('should default to USA when no territories specified', async () => {
        // Given - an Apple that accepts the event only when it is scheduled for the USA alone
        await using _ = await appleAcceptsCreate({
            data: { attributes: { territorySchedules: [{ territories: ['USA'] }] } },
        });

        // Then - the create went through
        const result = await adapter.create(makeBroadcast());

        expect(result.status).toBe('created');
    });

    test('should default deepLink to empty string when not provided', async () => {
        // Given - an Apple that accepts the event only when its deep link is empty
        await using _ = await appleAcceptsCreate({ data: { attributes: { deepLink: '' } } });
        const broadcast = makeBroadcast();
        delete broadcast.deepLink;

        // Then - the create went through
        const result = await adapter.create(broadcast);

        expect(result.status).toBe('created');
    });

    test('should throw AppleAppStoreError on API failure', async () => {
        // Given - an Apple that refuses the event with a 403
        await using _ = await intercept(
            http.post(`${BASE_URL}/appEvents`),
            http.json({ errors: [{ detail: 'Forbidden' }] }, { status: 403 }),
        );

        // Then - the refusal reaches the caller as the adapter's own error
        const caughtError = await adapter.create(makeBroadcast()).catch((error: unknown) => error);

        expect(caughtError).toBeInstanceOf(AppleAppStoreError);
        expect(caughtError).toMatchObject({ statusCode: 403 });
    });
});

describe('appleAppStoreAdapter list', () => {
    test('should list events for the app', async () => {
        // Given - an Apple listing three events of this app in three different states
        await using _ = await intercept(
            http.get(`${BASE_URL}/apps/6444444444/appEvents`),
            http.json({
                data: [
                    {
                        attributes: {
                            badge: 'SPECIAL_EVENT',
                            eventState: 'PUBLISHED',
                            referenceName: 'Spring Event',
                        },
                        id: 'event-1',
                        type: 'appEvents',
                    },
                    {
                        attributes: {
                            badge: 'CHALLENGE',
                            eventState: 'DRAFT',
                            referenceName: 'Weekly Challenge',
                        },
                        id: 'event-2',
                        type: 'appEvents',
                    },
                    {
                        attributes: {
                            badge: 'LIVE_EVENT',
                            eventState: 'WAITING_FOR_REVIEW',
                            referenceName: 'Live Show',
                        },
                        id: 'event-3',
                        type: 'appEvents',
                    },
                ],
            }),
        );

        // Then - each event reaches the port under the status its state means
        const results = await adapter.list();

        expect(results.map(({ id, status }) => ({ id, status }))).toStrictEqual([
            { id: 'event-1', status: 'published' },
            { id: 'event-2', status: 'created' },
            { id: 'event-3', status: 'submitted' },
        ]);
    });

    /* The last row is the fallback: a state the port does not know reads as `created`. */
    test.each([
        ['DRAFT', 'created'],
        ['WAITING_FOR_REVIEW', 'submitted'],
        ['APPROVED', 'approved'],
        ['ACCEPTED', 'approved'],
        ['PUBLISHED', 'published'],
        ['PAST', 'published'],
        ['REJECTED', 'rejected'],
        ['UNKNOWN_STATE', 'created'],
    ] as const)('should read the %s event state as %s', async (appleState, expectedStatus) => {
        // Given - a listing that carries one event in that state
        await using _ = await intercept(
            http.get(`${BASE_URL}/apps/6444444444/appEvents`),
            http.json({
                data: [
                    {
                        attributes: {
                            badge: 'SPECIAL_EVENT',
                            eventState: appleState,
                            referenceName: 'Test',
                        },
                        id: 'e-1',
                        type: 'appEvents',
                    },
                ],
            }),
        );

        // Then - the state reaches the port as the status it means
        const results = await adapter.list();

        expect(results[0]?.status).toBe(expectedStatus);
    });

    test('should return empty array when no events exist', async () => {
        // Given - an Apple with no event for this app
        await using _ = await intercept(
            http.get(`${BASE_URL}/apps/6444444444/appEvents`),
            http.json({ data: [] }),
        );

        // Then - an empty array is returned
        const results = await adapter.list();

        expect(results).toHaveLength(0);
    });
});

describe('appleAppStoreAdapter update', () => {
    test('should send a PATCH request with partial attributes', async () => {
        // Given - an Apple that accepts the patch only with both changed attributes
        await using _ = await intercept(
            http.patch(`${BASE_URL}/appEvents/event-123`, {
                body: {
                    data: {
                        attributes: {
                            deepLink: 'signews://events/updated',
                            priority: 'HIGH',
                        },
                        id: 'event-123',
                        type: 'appEvents',
                    },
                },
            }),
            http.json(CREATED_EVENT),
        );

        // Then - the patch went through and the result names the event it changed
        const result = await adapter.update('event-123', {
            deepLink: 'signews://events/updated',
            priority: 'high',
        });

        expect(result).toMatchObject({ id: 'event-123', provider: 'apple-app-store' });
    });

    test('should only include provided fields in the update', async () => {
        // Given - an Apple that records the patch body rather than constraining it
        let sent: unknown;
        await using _ = await intercept(
            http.patch(`${BASE_URL}/appEvents/event-123`),
            (request) => {
                sent = request.body;
                return http.json(CREATED_EVENT);
            },
        );

        // Then - the body carries the one field the caller changed, and nothing else
        await adapter.update('event-123', { audience: 'lapsed-users' });

        expect(sent).toStrictEqual({
            data: {
                attributes: { purpose: 'ATTRACT_LAPSED_USERS' },
                id: 'event-123',
                type: 'appEvents',
            },
        });
    });

    test('should map requiresPurchase in updates', async () => {
        // Given - an Apple that accepts the patch only when a purchase is required
        await using _ = await intercept(
            http.patch(`${BASE_URL}/appEvents/event-123`, {
                body: { data: { attributes: { purchaseRequirement: 'IN_APP_PURCHASE' } } },
            }),
            http.json(CREATED_EVENT),
        );

        // Then - the patch went through
        const result = await adapter.update('event-123', { requiresPurchase: true });

        expect(result.status).toBe('created');
    });
});

describe('appleAppStoreAdapter delete', () => {
    test('should send a DELETE request', async () => {
        // Given - an Apple that answers a deletion of this event with an empty 204
        await using _ = await intercept(
            http.delete(`${BASE_URL}/appEvents/event-123`),
            http.empty(),
        );

        // Then - the deletion resolves, which only a matching URL and verb allow
        await expect(adapter.delete('event-123')).resolves.toBeUndefined();
    });

    test('should throw on API failure', async () => {
        // Given - an Apple that knows no such event
        await using _ = await intercept(
            http.delete(`${BASE_URL}/appEvents/nonexistent`),
            http.json({ errors: [{ detail: 'Not found' }] }, { status: 404 }),
        );

        // Then - an AppleAppStoreError is thrown
        await expect(adapter.delete('nonexistent')).rejects.toThrow(AppleAppStoreError);
    });
});

describe('appleAppStoreAdapter error handling', () => {
    test('should include status code and response body in error', async () => {
        // Given - an Apple that refuses the event with a 422 and a detailed body
        const errorBody = { errors: [{ code: 'INVALID', detail: 'Invalid request' }] };
        await using _ = await intercept(
            http.post(`${BASE_URL}/appEvents`),
            http.json(errorBody, { status: 422 }),
        );

        // Then - the error carries the status code and the body verbatim
        const rejection: unknown = await adapter
            .create(makeBroadcast())
            .catch((error: unknown) => error);

        expect(rejection).toMatchObject({
            responseBody: JSON.stringify(errorBody),
            statusCode: 422,
        });
    });
});
