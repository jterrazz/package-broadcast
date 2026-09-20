import { describe, expect, test } from 'vitest';

import { SAMPLE_PRIVATE_KEY } from './apple-authentication.fixtures.js';
import { createAppleJwt } from './apple-authentication.js';

describe('createAppleJwt', () => {
    test('generates a valid JWT with correct structure', async () => {
        // Given - valid Apple credentials
        const token = await createAppleJwt({
            issuerId: 'test-issuer-id',
            keyId: 'TEST_KEY_1',
            privateKey: SAMPLE_PRIVATE_KEY,
        });

        // Then - the token is a 3-part JWT string
        expect(token).toBeTypeOf('string');
        expect(token.split('.')).toHaveLength(3);
    });

    test('sets correct JWT header fields', async () => {
        // Given - valid credentials with specific key ID
        const token = await createAppleJwt({
            issuerId: 'test-issuer-id',
            keyId: 'MY_KEY_99',
            privateKey: SAMPLE_PRIVATE_KEY,
        });

        // Then - header contains algorithm, key ID, and type
        const header = JSON.parse(Buffer.from(token.split('.')[0] ?? '', 'base64url').toString());
        expect(header.alg).toBe('ES256');
        expect(header.kid).toBe('MY_KEY_99');
        expect(header.typ).toBe('JWT');
    });

    test('sets correct JWT payload fields', async () => {
        // Given - valid credentials with specific issuer
        const token = await createAppleJwt({
            issuerId: 'my-issuer-id',
            keyId: 'TEST_KEY_1',
            privateKey: SAMPLE_PRIVATE_KEY,
        });

        // Then - payload contains issuer, audience, and 20-minute expiry
        const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString());
        expect(payload.iss).toBe('my-issuer-id');
        expect(payload.aud).toBe('appstoreconnect-v1');
        expect(payload.exp - payload.iat).toBe(20 * 60);
    });

    test('throws on invalid private key', async () => {
        // Given - invalid PEM key
        const signing = createAppleJwt({
            issuerId: 'test',
            keyId: 'test',
            privateKey: 'not-a-valid-key',
        });

        // Then - signing rejects with the PKCS#8 parse error
        await expect(signing).rejects.toThrow('"pkcs8" must be PKCS#8 formatted string');
    });
});
