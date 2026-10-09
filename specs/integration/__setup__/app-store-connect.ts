import { generateKeyPairSync } from 'node:crypto';

import type { AppleAppStoreConfig, Broadcast } from '../../../src/index.js';

// value: a throwaway ES256 (P-256) pair minted per run, so every token a spec sends was really signed and opens nothing outside the process.
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

/** The public half of the key the app signs with, PEM-encoded, to verify what it signed. */
export const VERIFYING_KEY = publicKey.export({ format: 'pem', type: 'spki' });

/** An App Store Connect app, and the API key it signs its tokens with. */
export const APP: AppleAppStoreConfig = {
    appId: '6444444444',
    issuerId: '57246542-96fe-1a63-e053-0824d011072a',
    keyId: '2X9R4HXF34',
    privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }),
};

/** The spring live event, with `overrides` laid over it. */
export const springEvent = (overrides: Partial<Broadcast> = {}): Broadcast => ({
    audience: 'all',
    badge: 'special-event',
    endDate: new Date('2026-04-15T00:00:00.000Z'),
    longDescription: 'Join us for a special live event with exclusive content and prizes.',
    priority: 'normal',
    shortDescription: 'Live event this weekend!',
    startDate: new Date('2026-04-01T00:00:00.000Z'),
    title: 'Spring Event',
    ...overrides,
});
