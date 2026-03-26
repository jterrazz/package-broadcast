import type {
  Broadcast,
  BroadcastAudience,
  BroadcastBadge,
  BroadcastProviderPort,
  BroadcastResult,
} from "../../ports/broadcast.port.js";

import { type AppleAuthConfig, createAppleJwt } from "./apple-auth.js";

export interface AppleAppStoreConfig extends AppleAuthConfig {
  /** The App Store Connect app ID (e.g. "6444444444") */
  appId: string;
}

const BASE_URL = "https://api.appstoreconnect.apple.com/v1";

/**
 * Broadcast provider for Apple App Store In-App Events.
 *
 * @see https://developer.apple.com/app-store/in-app-events/
 */
export class AppleAppStoreAdapter implements BroadcastProviderPort {
  readonly name = "apple-app-store";

  constructor(private readonly config: AppleAppStoreConfig) {}

  async create(broadcast: Broadcast): Promise<BroadcastResult> {
    const token = await createAppleJwt(this.config);

    // Step 1: Create the event
    const eventBody = {
      data: {
        attributes: {
          badge: mapBadge(broadcast.badge),
          deepLink: broadcast.deepLink ?? "",
          primaryLocale: "en-US",
          priority: broadcast.priority === "high" ? "HIGH" : "NORMAL",
          purchaseRequirement: broadcast.requiresPurchase
            ? "IN_APP_PURCHASE"
            : "NO_COST_ASSOCIATED",
          purpose: mapAudience(broadcast.audience),
          referenceName: broadcast.title,
          territorySchedules: this.buildTerritorySchedules(broadcast),
        },
        relationships: {
          app: {
            data: {
              id: this.config.appId,
              type: "apps",
            },
          },
        },
        type: "appEvents",
      },
    };

    const eventResponse = await this.request<AppleEventResponse>(
      "/appEvents",
      "POST",
      token,
      eventBody,
    );

    const eventId = eventResponse.data.id;

    // Step 2: Create the localization
    const localizationBody = {
      data: {
        attributes: {
          locale: "en-US",
          longDescription: broadcast.longDescription,
          name: broadcast.title,
          shortDescription: broadcast.shortDescription,
        },
        relationships: {
          appEvent: {
            data: {
              id: eventId,
              type: "appEvents",
            },
          },
        },
        type: "appEventLocalizations",
      },
    };

    await this.request("/appEventLocalizations", "POST", token, localizationBody);

    return {
      id: eventId,
      provider: this.name,
      raw: eventResponse,
      status: "created",
    };
  }

  async delete(id: string): Promise<void> {
    const token = await createAppleJwt(this.config);
    await this.request(`/appEvents/${id}`, "DELETE", token);
  }

  async list(): Promise<BroadcastResult[]> {
    const token = await createAppleJwt(this.config);

    const response = await this.request<AppleListResponse>(
      `/apps/${this.config.appId}/appEvents`,
      "GET",
      token,
    );

    return response.data.map((event) => ({
      id: event.id,
      provider: this.name,
      raw: event,
      status: mapAppleStatus(event.attributes.eventState),
    }));
  }

  async update(id: string, broadcast: Partial<Broadcast>): Promise<BroadcastResult> {
    const token = await createAppleJwt(this.config);

    const attributes: Record<string, unknown> = {};

    if (broadcast.deepLink !== undefined) {
      attributes.deepLink = broadcast.deepLink;
    }

    if (broadcast.priority !== undefined) {
      attributes.priority = broadcast.priority === "high" ? "HIGH" : "NORMAL";
    }

    if (broadcast.requiresPurchase !== undefined) {
      attributes.purchaseRequirement = broadcast.requiresPurchase
        ? "IN_APP_PURCHASE"
        : "NO_COST_ASSOCIATED";
    }

    if (broadcast.audience !== undefined) {
      attributes.purpose = mapAudience(broadcast.audience);
    }

    const body = {
      data: {
        attributes,
        id,
        type: "appEvents",
      },
    };

    const response = await this.request<AppleEventResponse>(
      `/appEvents/${id}`,
      "PATCH",
      token,
      body,
    );

    return {
      id,
      provider: this.name,
      raw: response,
      status: mapAppleStatus(response.data.attributes.eventState),
    };
  }

  private buildTerritorySchedules(broadcast: Broadcast): AppleTerritorySchedule[] {
    // If no territories specified, use a single schedule for all
    const territories = broadcast.territories ?? ["USA"];

    return [
      {
        eventEnd: broadcast.endDate.toISOString(),
        eventStart: broadcast.startDate.toISOString(),
        publishStart: broadcast.startDate.toISOString(),
        territories,
      },
    ];
  }

  private async request<T>(
    path: string,
    method: string,
    token: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AppleAppStoreError(
        `App Store Connect API error: ${response.status} ${response.statusText}`,
        response.status,
        errorBody,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}

export class AppleAppStoreError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = "AppleAppStoreError";
  }
}

// --- Apple API type mappings ---

function mapAudience(audience: BroadcastAudience): string {
  const map: Record<BroadcastAudience, string> = {
    "active-users": "APPROPRIATE_FOR_ALL_USERS",
    all: "APPROPRIATE_FOR_ALL_USERS",
    "lapsed-users": "ATTRACT_LAPSED_USERS",
    "new-users": "ATTRACT_NEW_USERS",
  };
  return map[audience];
}

function mapBadge(badge: BroadcastBadge): string {
  const map: Record<BroadcastBadge, string> = {
    challenge: "CHALLENGE",
    competition: "COMPETITION",
    "live-event": "LIVE_EVENT",
    "major-update": "MAJOR_UPDATE",
    "new-season": "NEW_SEASON",
    premiere: "PREMIERE",
    "special-event": "SPECIAL_EVENT",
  };
  return map[badge];
}

interface AppleTerritorySchedule {
  eventEnd: string;
  eventStart: string;
  publishStart: string;
  territories: string[];
}

interface AppleEventResponse {
  data: {
    attributes: {
      badge: string;
      eventState: string;
    };
    id: string;
    type: string;
  };
}

interface AppleListResponse {
  data: Array<{
    attributes: {
      badge: string;
      eventState: string;
      referenceName: string;
    };
    id: string;
    type: string;
  }>;
}

function mapAppleStatus(eventState: string): BroadcastResult["status"] {
  const map: Record<string, BroadcastResult["status"]> = {
    ACCEPTED: "approved",
    APPROVED: "approved",
    DRAFT: "created",
    PAST: "published",
    PUBLISHED: "published",
    REJECTED: "rejected",
    WAITING_FOR_REVIEW: "submitted",
  };
  return map[eventState] ?? "created";
}
