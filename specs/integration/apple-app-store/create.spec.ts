import { describe, expect, test } from 'vitest';

import { AppleAppStoreAdapter, AppleAppStoreError } from '../../../src/index.js';
import type { Broadcast } from '../../../src/index.js';
import { APP, springEvent } from '../__setup__/app-store-connect.js';
import { refusingApp, withEventHolding } from '../__setup__/stubs/app-store.stubs.js';
import { integration } from '../integration.specification.js';

const CREATED = {
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
};

const create = async (attributes: object, broadcast: Broadcast) =>
    await integration
        .intercept(withEventHolding(attributes))
        .call(async () => await new AppleAppStoreAdapter(APP).create(broadcast));

describe('create', () => {
    test('creates the event of the app, then its English localization', async () => {
        // Given - an App Store Connect taking exactly the event this broadcast describes
        const result = await create(
            {
                badge: 'SPECIAL_EVENT',
                deepLink: 'signews://events/spring-2026',
                primaryLocale: 'en-US',
                priority: 'NORMAL',
                purchaseRequirement: 'NO_COST_ASSOCIATED',
                purpose: 'APPROPRIATE_FOR_ALL_USERS',
                referenceName: 'Spring Event',
                territorySchedules: [
                    {
                        eventEnd: '2026-04-15T00:00:00.000Z',
                        eventStart: '2026-04-01T00:00:00.000Z',
                        publishStart: '2026-04-01T00:00:00.000Z',
                        territories: ['USA'],
                    },
                ],
            },
            springEvent({ deepLink: 'signews://events/spring-2026' }),
        );

        // Then - the event Apple named is the result, its localization taken after it
        expect(result.value).toMatch(CREATED);
    });

    test.each([
        ['challenge', 'CHALLENGE'],
        ['competition', 'COMPETITION'],
        ['live-event', 'LIVE_EVENT'],
        ['major-update', 'MAJOR_UPDATE'],
        ['new-season', 'NEW_SEASON'],
        ['premiere', 'PREMIERE'],
        ['special-event', 'SPECIAL_EVENT'],
    ] as const)('sends the %s badge as %s', async (badge, expected) => {
        // Given - an App Store Connect taking the event only under that badge
        const result = await create({ badge: expected }, springEvent({ badge }));

        // Then - the event was created
        expect(result.value).toMatch(CREATED);
    });

    test.each([
        ['all', 'APPROPRIATE_FOR_ALL_USERS'],
        ['active-users', 'APPROPRIATE_FOR_ALL_USERS'],
        ['new-users', 'ATTRACT_NEW_USERS'],
        ['lapsed-users', 'ATTRACT_LAPSED_USERS'],
    ] as const)('sends the %s audience as the %s purpose', async (audience, expected) => {
        // Given - an App Store Connect taking the event only under that purpose
        const result = await create({ purpose: expected }, springEvent({ audience }));

        // Then - the event was created
        expect(result.value).toMatch(CREATED);
    });

    test.each<[Partial<Broadcast>, object]>([
        [{ priority: 'high' }, { priority: 'HIGH' }],
        [{ requiresPurchase: true }, { purchaseRequirement: 'IN_APP_PURCHASE' }],
        [{ requiresPurchase: false }, { purchaseRequirement: 'NO_COST_ASSOCIATED' }],
        [{}, { deepLink: '' }],
        [
            { territories: ['FRA', 'DEU'] },
            { territorySchedules: [{ territories: ['FRA', 'DEU'] }] },
        ],
    ])('sends %o as %o', async (overrides, expected) => {
        // Given - an App Store Connect taking the event only with that attribute
        const result = await create(expected, springEvent(overrides));

        // Then - the event was created
        expect(result.value).toMatch(CREATED);
    });

    test('raises the status and the body App Store Connect refused the event with', async () => {
        // Given - an App Store Connect refusing every event of the app
        const result = await integration.intercept(refusingApp(APP.appId)).call(
            async () =>
                await new AppleAppStoreAdapter(APP).create(springEvent()).catch(
                    (error: unknown) =>
                        error instanceof AppleAppStoreError && {
                            message: error.message,
                            name: error.name,
                            responseBody: error.responseBody,
                            statusCode: error.statusCode,
                        },
                ),
        );

        // Then - the refusal is an AppleAppStoreError carrying Apple's answer verbatim
        expect(result.value).toMatch({
            message: 'App Store Connect API error: 422 Unprocessable Entity',
            name: 'AppleAppStoreError',
            responseBody:
                '{"errors":[{"code":"ENTITY_ERROR.ATTRIBUTE.INVALID","detail":"deepLink is invalid"}]}',
            statusCode: 422,
        });
    });
});
