/**
 * Local test script — fetches the top signews event and shows
 * exactly what would be sent to Apple App Store Connect.
 *
 * Run: node test-local.mjs
 */

import { AppleAppStoreAdapter } from "./dist/index.js";

// --- 1. Fetch the top event from signews prod API ---

const API_URL = "https://signews.jterrazz.com/api/events?limit=1";

console.log("━━━ Fetching top event from signews API ━━━");
console.log(`GET ${API_URL}\n`);

const res = await fetch(API_URL);
const { items } = await res.json();
const event = items[0];

console.log("Event received:");
console.log(JSON.stringify(event, null, 2));
console.log();

// --- 2. Map signews event → Broadcast model ---

const severityToBadge = {
  CRITICAL: "live-event",
  HIGH: "special-event",
  MODERATE: "new-season",
  LOW: "premiere",
};

const broadcast = {
  title: event.label.slice(0, 30),
  shortDescription: event.description.slice(0, 50),
  longDescription: event.description.slice(0, 120),
  badge: severityToBadge[event.severity] ?? "special-event",
  audience: "all",
  priority: event.severity === "CRITICAL" ? "high" : "normal",
  startDate: new Date(event.period.start),
  endDate: new Date(event.period.end),
  deepLink: `signews://events/${event.id}`,
  territories: ["USA", "FRA"],
};

console.log("━━━ Broadcast model ━━━");
console.log(JSON.stringify(broadcast, null, 2));
console.log();

// --- 3. Dry-run: show what the adapter would send to Apple ---

// Intercept fetch to log instead of calling Apple
const originalFetch = globalThis.fetch;
let callCount = 0;

globalThis.fetch = async (url, options) => {
  callCount++;
  console.log(`━━━ Apple API Call #${callCount} ━━━`);
  console.log(`${options.method} ${url}`);
  console.log("Headers:", JSON.stringify(options.headers, null, 2));
  if (options.body) {
    console.log("Body:", JSON.stringify(JSON.parse(options.body), null, 2));
  }
  console.log();

  // Return mock responses so the adapter completes
  if (options.method === "POST" && url.includes("/inAppEvents")) {
    return new Response(
      JSON.stringify({
        data: {
          id: "mock-event-id-12345",
          type: "inAppEvents",
          attributes: { badge: "LIVE_EVENT", eventState: "DRAFT" },
        },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  }

  // Localization response
  return new Response(
    JSON.stringify({
      data: {
        id: "mock-loc-id-67890",
        type: "inAppEventLocalizations",
        attributes: { locale: "en-US" },
      },
    }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  );
};

// Use dummy credentials (JWT will be generated but never actually sent)
const adapter = new AppleAppStoreAdapter({
  issuerId: "DUMMY-ISSUER-ID",
  keyId: "DUMMY_KEY",
  privateKey: `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgevZzL1gdAFr88hb2
OF/2NxApJCzGCEDdfSp6VQO30hyhRANCAAQRWz+jn65BtOMvdyHKcvjBeBSDZH2r
1RTwjmYSi9R/zpBnuQ4EiMnCqfMPWiZqB4QdbAd0E7oH50VpuZ1P087G
-----END PRIVATE KEY-----`,
  appId: "6444444444",
});

const result = await adapter.create(broadcast);

console.log("━━━ Result ━━━");
console.log(JSON.stringify(result, null, 2));

globalThis.fetch = originalFetch;
