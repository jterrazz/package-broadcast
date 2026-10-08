import { describe, expect, test } from 'vitest';

import { AppleAppStoreAdapter } from '../../../src/index.js';
import { APP } from '../__setup__/app-store-connect.js';
import { listingAs } from '../__setup__/stubs/app-store.stubs.js';
import { integration } from '../integration.specification.js';

describe('unexpected-answer', () => {
    test.each([
        ['no id', { attributes: { eventState: 'DRAFT' }, type: 'appEvents' }, 'data[0].id'],
        [
            'no state',
            { attributes: { badge: 'LIVE_EVENT' }, id: 'event-1', type: 'appEvents' },
            'data[0].attributes.eventState',
        ],
    ])('refuses an event App Store Connect answered with %s', async (_, event, path) => {
        // Given - the app's one event, missing what a result is read from
        const result = await integration
            .intercept(listingAs(event))
            .call(async () => await new AppleAppStoreAdapter(APP).list());

        // Then - the listing is refused, naming what is missing
        expect(result.error).toMatch(
            `App Store Connect answered an unexpected shape: ✖ Invalid input: expected string, received undefined\n  → at ${path}`,
        );
    });
});
