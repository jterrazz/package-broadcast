import { generateKeyPairSync } from 'node:crypto';

/**
 * A throwaway ES256 (P-256) key pair, minted once per test run — it opens
 * nothing outside this process. It is real, so every test that needs an
 * App Store Connect token signs one instead of standing in for the signer.
 */
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

/** The private half, PEM-encoded for the adapter's config. */
export const SAMPLE_PRIVATE_KEY = privateKey.export({ format: 'pem', type: 'pkcs8' });

/** The public half, PEM-encoded, to verify a token this fixture's key signed. */
export const SAMPLE_PUBLIC_KEY = publicKey.export({ format: 'pem', type: 'spki' });
