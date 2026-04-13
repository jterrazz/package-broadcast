import type {
    Broadcast,
    BroadcastAudience,
    BroadcastBadge,
    BroadcastProviderPort,
    BroadcastResult,
} from '../../ports/broadcast.port.js';
import { type AppleAuthConfig, createAppleJwt } from './apple-auth.js';

interface AppleAppStoreConfig extends AppleAuthConfig {
    /** The App Store Connect app ID (e.g. "6444444444") */
    appId: string;
}

const BASE_URL = 'https://api.appstoreconnect.apple.com/v1';

/**
 * Broadcast provider for Apple App Store In-App Events.
 *
 * @see https://developer.apple.com/app-store/in-app-events/
 */
class AppleAppStoreAdapter implements BroadcastProviderPort {
    readonly name = 'apple-app-store';
    private readonly config: AppleAppStoreConfig;

    constructor(config: AppleAppStoreConfig) {
        this.config = config;
    }

    async create(broadcast: Broadcast): Promise<BroadcastResult> {
        const token = await createAppleJwt(this.config);

        // Step 1: Create the event
        const eventBody = {
            data: {
                attributes: {
                    badge: mapBadge(broadcast.badge),
                    deepLink: broadcast.deepLink ?? '',
                    primaryLocale: 'en-US',
                    priority: broadcast.priority === 'high' ? 'HIGH' : 'NORMAL',
                    purchaseRequirement: broadcast.requiresPurchase
                        ? 'IN_APP_PURCHASE'
                        : 'NO_COST_ASSOCIATED',
                    purpose: mapAudience(broadcast.audience),
                    referenceName: broadcast.title,
                    territorySchedules: this.buildTerritorySchedules(broadcast),
                },
                relationships: {
                    app: {
                        data: {
                            id: this.config.appId,
                            type: 'apps',
                        },
                    },
                },
                type: 'appEvents',
            },
        };

        const eventResponse = await this.request<AppleEventResponse>(
            '/appEvents',
            'POST',
            token,
            eventBody,
        );

        const eventId = eventResponse.data.id;

        // Step 2: Create the localization
        const localizationBody = {
            data: {
                attributes: {
                    locale: 'en-US',
                    longDescription: broadcast.longDescription,
                    name: broadcast.title,
                    shortDescription: broadcast.shortDescription,
                },
                relationships: {
                    appEvent: {
                        data: {
                            id: eventId,
                            type: 'appEvents',
                        },
                    },
                },
                type: 'appEventLocalizations',
            },
        };

        const localizationResponse = await this.request<AppleLocalizationResponse>(
            '/appEventLocalizations',
            'POST',
            token,
            localizationBody,
        );

        // Step 3: Upload images if provided
        const localizationId = localizationResponse.data.id;

        if (broadcast.cardImageUrl) {
            await this.uploadEventImage(
                token,
                localizationId,
                broadcast.cardImageUrl,
                'EVENT_CARD',
            );
        }

        if (broadcast.detailImageUrl) {
            await this.uploadEventImage(
                token,
                localizationId,
                broadcast.detailImageUrl,
                'EVENT_DETAILS_PAGE',
            );
        }

        return {
            id: eventId,
            provider: this.name,
            raw: eventResponse,
            status: 'created',
        };
    }

    async delete(id: string): Promise<void> {
        const token = await createAppleJwt(this.config);
        await this.request(`/appEvents/${id}`, 'DELETE', token);
    }

    async list(): Promise<BroadcastResult[]> {
        const token = await createAppleJwt(this.config);

        const response = await this.request<AppleListResponse>(
            `/apps/${this.config.appId}/appEvents`,
            'GET',
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
            attributes.priority = broadcast.priority === 'high' ? 'HIGH' : 'NORMAL';
        }

        if (broadcast.requiresPurchase !== undefined) {
            attributes.purchaseRequirement = broadcast.requiresPurchase
                ? 'IN_APP_PURCHASE'
                : 'NO_COST_ASSOCIATED';
        }

        if (broadcast.audience !== undefined) {
            attributes.purpose = mapAudience(broadcast.audience);
        }

        const body = {
            data: {
                attributes,
                id,
                type: 'appEvents',
            },
        };

        const response = await this.request<AppleEventResponse>(
            `/appEvents/${id}`,
            'PATCH',
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

    private async uploadEventImage(
        token: string,
        localizationId: string,
        imageUrl: string,
        assetType: 'EVENT_CARD' | 'EVENT_DETAILS_PAGE',
    ): Promise<void> {
        // Download the image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to download image from ${imageUrl}: ${imageResponse.status}`);
        }

        const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());
        const contentType = imageResponse.headers.get('content-type') ?? 'image/png';
        const extension =
            contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
        const fileName = `event-card.${extension}`;

        // Step 1: Reserve the screenshot slot
        const reserveBody = {
            data: {
                attributes: {
                    appEventAssetType: assetType,
                    fileName,
                    fileSize: imageBuffer.byteLength,
                },
                relationships: {
                    appEventLocalization: {
                        data: {
                            id: localizationId,
                            type: 'appEventLocalizations',
                        },
                    },
                },
                type: 'appEventScreenshots',
            },
        };

        const reserveResponse = await this.request<AppleScreenshotResponse>(
            '/appEventScreenshots',
            'POST',
            token,
            reserveBody,
        );

        const screenshotId = reserveResponse.data.id;
        const uploadOperations = reserveResponse.data.attributes.uploadOperations ?? [];

        // Step 2: Upload image chunks
        for (const operation of uploadOperations) {
            const chunk = imageBuffer.slice(operation.offset, operation.offset + operation.length);

            const headers: Record<string, string> = {};
            for (const header of operation.requestHeaders ?? []) {
                headers[header.name] = header.value;
            }

            const uploadResponse = await fetch(operation.url, {
                body: chunk,
                headers,
                method: operation.method,
            });

            if (!uploadResponse.ok) {
                throw new Error(
                    `Failed to upload image chunk: ${uploadResponse.status} ${uploadResponse.statusText}`,
                );
            }
        }

        // Step 3: Commit the upload
        await this.request(`/appEventScreenshots/${screenshotId}`, 'PATCH', token, {
            data: {
                attributes: {
                    uploaded: true,
                },
                id: screenshotId,
                type: 'appEventScreenshots',
            },
        });
    }

    private buildTerritorySchedules(broadcast: Broadcast): AppleTerritorySchedule[] {
        // If no territories specified, use a single schedule for all
        const territories = broadcast.territories ?? ['USA'];

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
                'Content-Type': 'application/json',
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

class AppleAppStoreError extends Error {
    readonly statusCode: number;
    readonly responseBody: string;

    constructor(message: string, statusCode: number, responseBody: string) {
        super(message);
        this.name = 'AppleAppStoreError';
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }
}

// --- Apple API type mappings ---

function mapAudience(audience: BroadcastAudience): string {
    const map: Record<BroadcastAudience, string> = {
        'active-users': 'APPROPRIATE_FOR_ALL_USERS',
        all: 'APPROPRIATE_FOR_ALL_USERS',
        'lapsed-users': 'ATTRACT_LAPSED_USERS',
        'new-users': 'ATTRACT_NEW_USERS',
    };
    return map[audience];
}

function mapBadge(badge: BroadcastBadge): string {
    const map: Record<BroadcastBadge, string> = {
        challenge: 'CHALLENGE',
        competition: 'COMPETITION',
        'live-event': 'LIVE_EVENT',
        'major-update': 'MAJOR_UPDATE',
        'new-season': 'NEW_SEASON',
        premiere: 'PREMIERE',
        'special-event': 'SPECIAL_EVENT',
    };
    return map[badge];
}

interface AppleTerritorySchedule {
    eventEnd: string;
    eventStart: string;
    publishStart: string;
    territories: string[];
}

interface AppleLocalizationResponse {
    data: {
        id: string;
        type: string;
    };
}

interface AppleScreenshotResponse {
    data: {
        attributes: {
            uploadOperations?: Array<{
                length: number;
                method: string;
                offset: number;
                requestHeaders?: Array<{ name: string; value: string }>;
                url: string;
            }>;
        };
        id: string;
        type: string;
    };
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

function mapAppleStatus(eventState: string): BroadcastResult['status'] {
    const map: Record<string, BroadcastResult['status']> = {
        ACCEPTED: 'approved',
        APPROVED: 'approved',
        DRAFT: 'created',
        PAST: 'published',
        PUBLISHED: 'published',
        REJECTED: 'rejected',
        WAITING_FOR_REVIEW: 'submitted',
    };
    return map[eventState] ?? 'created';
}

export { AppleAppStoreAdapter, type AppleAppStoreConfig, AppleAppStoreError };
