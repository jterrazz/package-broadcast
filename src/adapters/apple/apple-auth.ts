import { importPKCS8, SignJWT } from 'jose';

interface AppleAuthConfig {
    /** Issuer ID from App Store Connect (e.g. "57246542-96fe-1a63-e053-0824d011072a") */
    issuerId: string;

    /** Key ID from App Store Connect (e.g. "2X9R4HXF34") */
    keyId: string;

    /** Private key content in PEM format (ES256 / P-256) */
    privateKey: string;
}

const TOKEN_LIFETIME_SECONDS = 20 * 60; // 20 minutes (max allowed by Apple)
const AUDIENCE = 'appstoreconnect-v1';
const ALGORITHM = 'ES256';

/**
 * Generates a short-lived JWT for the App Store Connect API.
 * Tokens are valid for 20 minutes.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/generating_tokens_for_api_requests
 */
async function createAppleJwt(config: AppleAuthConfig): Promise<string> {
    const privateKey = await importPKCS8(config.privateKey, ALGORITHM);

    const now = Math.floor(Date.now() / 1000);

    return new SignJWT({})
        .setProtectedHeader({ alg: ALGORITHM, kid: config.keyId, typ: 'JWT' })
        .setIssuer(config.issuerId)
        .setIssuedAt(now)
        .setExpirationTime(now + TOKEN_LIFETIME_SECONDS)
        .setAudience(AUDIENCE)
        .sign(privateKey);
}

export { type AppleAuthConfig, createAppleJwt };
