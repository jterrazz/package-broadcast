import type {
    Broadcast,
    BroadcastProviderPort,
    BroadcastResult,
} from '../../ports/broadcast.port.js';
import { callAppStoreConnect } from './app-store-connect.js';
import { eventAttributesOf, patchAttributesOf, statusOf } from './apple-app-store.mapping.js';
import {
    AppleCreatedSchema,
    AppleEventListSchema,
    AppleEventResponseSchema,
    readAnswer,
} from './apple-app-store.schemas.js';
import { createAppleJwt } from './apple-authentication.js';
import type { AppleAuthConfig } from './apple-authentication.js';
import { uploadEventImage } from './apple-event-image.js';

type AppleAppStoreConfig = AppleAuthConfig & {
    /** The App Store Connect app ID (e.g. "6444444444"). */
    appId: string;
};

/**
 * The broadcast channel of Apple App Store In-App Events, through the App Store Connect API.
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

        const raw = await callAppStoreConnect(token, '/appEvents', {
            method: 'POST',
            body: {
                data: {
                    attributes: eventAttributesOf(broadcast),
                    relationships: { app: { data: { id: this.config.appId, type: 'apps' } } },
                    type: 'appEvents',
                },
            },
        });
        const eventId = readAnswer(AppleCreatedSchema, raw).data.id;

        const localization = await callAppStoreConnect(token, '/appEventLocalizations', {
            method: 'POST',
            body: {
                data: {
                    attributes: {
                        locale: 'en-US',
                        longDescription: broadcast.longDescription,
                        name: broadcast.title,
                        shortDescription: broadcast.shortDescription,
                    },
                    relationships: { appEvent: { data: { id: eventId, type: 'appEvents' } } },
                    type: 'appEventLocalizations',
                },
            },
        });
        const localizationId = readAnswer(AppleCreatedSchema, localization).data.id;

        if (broadcast.cardImageUrl !== undefined && broadcast.cardImageUrl !== '') {
            await uploadEventImage(token, localizationId, broadcast.cardImageUrl, 'EVENT_CARD');
        }

        if (broadcast.detailImageUrl !== undefined && broadcast.detailImageUrl !== '') {
            await uploadEventImage(
                token,
                localizationId,
                broadcast.detailImageUrl,
                'EVENT_DETAILS_PAGE',
            );
        }

        return { id: eventId, provider: this.name, raw, status: 'created' };
    }

    async delete(id: string): Promise<void> {
        const token = await createAppleJwt(this.config);
        await callAppStoreConnect(token, `/appEvents/${id}`, { method: 'DELETE' });
    }

    async list(): Promise<BroadcastResult[]> {
        const token = await createAppleJwt(this.config);

        const listing = await callAppStoreConnect(token, `/apps/${this.config.appId}/appEvents`);

        return readAnswer(AppleEventListSchema, listing).data.map((event) => ({
            id: event.id,
            provider: this.name,
            raw: event,
            status: statusOf(event.attributes.eventState),
        }));
    }

    async update(id: string, broadcast: Partial<Broadcast>): Promise<BroadcastResult> {
        const token = await createAppleJwt(this.config);

        const raw = await callAppStoreConnect(token, `/appEvents/${id}`, {
            body: { data: { attributes: patchAttributesOf(broadcast), id, type: 'appEvents' } },
            method: 'PATCH',
        });
        const event = readAnswer(AppleEventResponseSchema, raw).data;

        return { id, provider: this.name, raw, status: statusOf(event.attributes.eventState) };
    }
}

export { AppleAppStoreAdapter, type AppleAppStoreConfig };
