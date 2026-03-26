/**
 * Core broadcast model — a platform-agnostic announcement
 * that can be distributed to multiple channels.
 */
export interface Broadcast {
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

  /** URL to an image for the event card (will be downloaded and uploaded to providers) */
  imageUrl?: string;
}

export type BroadcastBadge =
  | "challenge"
  | "competition"
  | "live-event"
  | "major-update"
  | "new-season"
  | "premiere"
  | "special-event";

export type BroadcastAudience = "all" | "new-users" | "active-users" | "lapsed-users";

/**
 * Result of sending a broadcast to a provider.
 */
export interface BroadcastResult {
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
export interface BroadcastProviderPort {
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
