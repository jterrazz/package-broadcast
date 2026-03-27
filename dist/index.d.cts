//#region src/ports/broadcast.port.d.ts
/**
 * Core broadcast model — a platform-agnostic announcement
 * that can be distributed to multiple channels.
 */
interface Broadcast {
  /** Unique identifier (optional, assigned by providers) */
  id?: string;
  /** Display title — short, punchy (max ~30 chars for App Store compat) */
  title: string;
  /** Short teaser shown on cards/previews (max ~50 chars) */
  shortDescription: string;
  /** Longer description for detail views (max ~120 chars) */
  longDescription: string;
  /** When the event starts */
  startDate: Date;
  /** When the event ends */
  endDate: Date;
  /** Event category */
  badge: BroadcastBadge;
  /** Who should see this */
  audience: BroadcastAudience;
  /** Normal or high visibility */
  priority: "normal" | "high";
  /** Deep link URL into the app/site */
  deepLink?: string;
  /** Whether participation requires a purchase */
  requiresPurchase?: boolean;
  /** Regional availability (ISO 3166-1 alpha-2 codes). Undefined = all regions. */
  territories?: string[];
  /** URL to an image for the event card — landscape 16:9 (e.g. 1920x1080) */
  cardImageUrl?: string;
  /** URL to an image for the event detail page — portrait 9:16 (e.g. 1080x1920) */
  detailImageUrl?: string;
}
type BroadcastBadge = "challenge" | "competition" | "live-event" | "major-update" | "new-season" | "premiere" | "special-event";
type BroadcastAudience = "all" | "new-users" | "active-users" | "lapsed-users";
/**
 * Result of sending a broadcast to a provider.
 */
interface BroadcastResult {
  /** Provider-assigned ID */
  id: string;
  /** Provider name (e.g. "apple-app-store") */
  provider: string;
  /** Current status */
  status: "created" | "submitted" | "approved" | "published" | "rejected" | "failed";
  /** Raw response from the provider (for debugging) */
  raw?: unknown;
}
/**
 * Port that all broadcast providers must implement.
 */
interface BroadcastProviderPort {
  /** Provider identifier */
  readonly name: string;
  /** Create and submit a broadcast */
  create(broadcast: Broadcast): Promise<BroadcastResult>;
  /** Update an existing broadcast by provider ID */
  update(id: string, broadcast: Partial<Broadcast>): Promise<BroadcastResult>;
  /** Delete/cancel a broadcast by provider ID */
  delete(id: string): Promise<void>;
  /** List active broadcasts */
  list(): Promise<BroadcastResult[]>;
}
//#endregion
//#region src/send-broadcast.d.ts
/**
 * Send a broadcast to one or more providers concurrently.
 * Returns a result per provider, including failures.
 */
declare function sendBroadcast(broadcast: Broadcast, providers: BroadcastProviderPort[]): Promise<BroadcastResult[]>;
//#endregion
//#region src/adapters/apple/apple-auth.d.ts
interface AppleAuthConfig {
  /** Issuer ID from App Store Connect (e.g. "57246542-96fe-1a63-e053-0824d011072a") */
  issuerId: string;
  /** Key ID from App Store Connect (e.g. "2X9R4HXF34") */
  keyId: string;
  /** Private key content in PEM format (ES256 / P-256) */
  privateKey: string;
}
/**
 * Generates a short-lived JWT for the App Store Connect API.
 * Tokens are valid for 20 minutes.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/generating_tokens_for_api_requests
 */
declare function createAppleJwt(config: AppleAuthConfig): Promise<string>;
//#endregion
//#region src/adapters/apple/apple-app-store.adapter.d.ts
interface AppleAppStoreConfig extends AppleAuthConfig {
  /** The App Store Connect app ID (e.g. "6444444444") */
  appId: string;
}
/**
 * Broadcast provider for Apple App Store In-App Events.
 *
 * @see https://developer.apple.com/app-store/in-app-events/
 */
declare class AppleAppStoreAdapter implements BroadcastProviderPort {
  private readonly config;
  readonly name = "apple-app-store";
  constructor(config: AppleAppStoreConfig);
  create(broadcast: Broadcast): Promise<BroadcastResult>;
  delete(id: string): Promise<void>;
  list(): Promise<BroadcastResult[]>;
  update(id: string, broadcast: Partial<Broadcast>): Promise<BroadcastResult>;
  private uploadEventImage;
  private buildTerritorySchedules;
  private request;
}
declare class AppleAppStoreError extends Error {
  readonly statusCode: number;
  readonly responseBody: string;
  constructor(message: string, statusCode: number, responseBody: string);
}
//#endregion
export { AppleAppStoreAdapter, type AppleAppStoreConfig, AppleAppStoreError, type AppleAuthConfig, type Broadcast, type BroadcastAudience, type BroadcastBadge, type BroadcastProviderPort, type BroadcastResult, createAppleJwt, sendBroadcast };
//# sourceMappingURL=index.d.cts.map