import { describe, expect, test } from "vitest";

import { createAppleJwt } from "../apple-auth.js";

// Test ES256 private key (NOT a real key — generated for tests only)
const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgevZzL1gdAFr88hb2
OF/2NxApJCzGCEDdfSp6VQO30hyhRANCAAQRWz+jn65BtOMvdyHKcvjBeBSDZH2r
1RTwjmYSi9R/zpBnuQ4EiMnCqfMPWiZqB4QdbAd0E7oH50VpuZ1P087G
-----END PRIVATE KEY-----`;

describe("createAppleJwt", () => {
  test("should generate a valid JWT", async () => {
    // Given — valid Apple credentials
    const token = await createAppleJwt({
      issuerId: "test-issuer-id",
      keyId: "TEST_KEY_1",
      privateKey: TEST_PRIVATE_KEY,
    });

    // Then — the token is a valid JWT with correct header and payload
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    // JWT has 3 parts separated by dots
    const parts = token.split(".");
    expect(parts).toHaveLength(3);

    // Decode and verify the header
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    expect(header.alg).toBe("ES256");
    expect(header.kid).toBe("TEST_KEY_1");
    expect(header.typ).toBe("JWT");

    // Decode and verify the payload
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    expect(payload.iss).toBe("test-issuer-id");
    expect(payload.aud).toBe("appstoreconnect-v1");
    expect(payload.exp).toBeGreaterThan(payload.iat);
    expect(payload.exp - payload.iat).toBe(20 * 60);
  });
});
