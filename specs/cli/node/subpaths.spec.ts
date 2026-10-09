import { directory, packed } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

describe('subpaths', () => {
    test('the published entry loads from the tarball under both conditions', async () => {
        // Given - a consumer's project with the packed package installed
        const result = await cli
            .fixture(directory('./__fixtures__/consumer/'))
            .link('@jterrazz/broadcast', packed())
            .exec('subpaths.mjs');

        // Then - the ESM and CommonJS builds name the same API
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(`
            @jterrazz/broadcast (import): AppleAppStoreAdapter, AppleAppStoreError, createAppleJwt, sendBroadcast
            @jterrazz/broadcast (require): AppleAppStoreAdapter, AppleAppStoreError, createAppleJwt, sendBroadcast
        `);
    });
});
