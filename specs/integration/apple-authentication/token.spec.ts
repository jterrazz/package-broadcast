import { importSPKI, jwtVerify } from 'jose';
import { describe, expect, test } from 'vitest';

import { createAppleJwt } from '../../../src/index.js';
import { APP, VERIFYING_KEY } from '../__setup__/app-store-connect.js';
import { integration } from '../integration.specification.js';

describe('token', () => {
    test('signs a 20-minute ES256 token for App Store Connect with the API key', async () => {
        // Given - the app's API key, at a pinned instant
        const result = await integration.clock('2026-03-04T09:30:00Z').call(async () => {
            const token = await createAppleJwt(APP);
            const { payload, protectedHeader } = await jwtVerify(
                token,
                await importSPKI(VERIFYING_KEY, 'ES256'),
            );

            return { payload, protectedHeader };
        });

        // Then - the signature verifies, and the token names the key, the issuer and Apple's audience
        expect(result.value).toMatch({
            payload: {
                aud: 'appstoreconnect-v1',
                exp: 1_772_617_800,
                iat: 1_772_616_600,
                iss: '57246542-96fe-1a63-e053-0824d011072a',
            },
            protectedHeader: { alg: 'ES256', kid: '2X9R4HXF34', typ: 'JWT' },
        });
    });

    test('refuses a key that is not a PKCS#8 PEM', async () => {
        // Given - an API key that is no key at all
        const result = await integration.call(
            async () => await createAppleJwt({ ...APP, privateKey: 'not-a-key' }),
        );

        // Then - the signing is refused before any call is made
        expect(result.error).toMatch('"pkcs8" must be PKCS#8 formatted string');
    });
});
