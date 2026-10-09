import { describe, expect, test } from 'vitest';

import { AppleAppStoreAdapter } from '../../../src/index.js';
import { APP } from '../__setup__/app-store-connect.js';
import { deleting, knowingNoEvent } from '../__setup__/stubs/app-store.stubs.js';
import { integration } from '../integration.specification.js';

describe('delete', () => {
    test('deletes the event', async () => {
        // Given - an App Store Connect dropping the event
        const result = await integration.intercept(deleting).call(async () => {
            await new AppleAppStoreAdapter(APP).delete('event-1');
        });

        // Then - the deletion resolved with nothing
        expect(result.error.text).toBe('');
    });

    test('refuses an event App Store Connect does not know', async () => {
        // Given - an App Store Connect knowing no such event
        const result = await integration.intercept(knowingNoEvent).call(async () => {
            await new AppleAppStoreAdapter(APP).delete('event-9');
        });

        // Then - the refusal names the status
        expect(result.error).toMatch('App Store Connect API error: 404 Not Found');
    });
});
