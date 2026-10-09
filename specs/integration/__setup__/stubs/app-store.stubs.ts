import { defineStubs } from '@jterrazz/test';

import chunkRefused from './http/chunk-refused.js';
import chunkUploaded from './http/chunk-uploaded.js';
import eventCreated from './http/event-created.js';
import eventDeleted from './http/event-deleted.js';
import eventMissing from './http/event-missing.js';
import eventRefused from './http/event-refused.js';
import eventUpdated from './http/event-updated.js';
import eventsListed from './http/events-listed.js';
import imageDownloaded from './http/image-downloaded.js';
import imageMissing from './http/image-missing.js';
import localizationCreated from './http/localization-created.js';
import screenshotCommitted from './http/screenshot-committed.js';
import screenshotReserved from './http/screenshot-reserved.js';

/** The world a create lives in: App Store Connect takes the event, then its localization. */
export const appStore = defineStubs(eventCreated(), localizationCreated);

/** …where the event is taken only when its attributes hold `attributes`. */
export const withEventHolding = (attributes: object) => appStore.with(eventCreated(attributes));

/** An App Store Connect refusing every event of the app `appId`. */
export const refusingApp = (appId: string) => defineStubs(eventRefused(appId));

/** The app's events, one per state in `states`. */
export const listing = (states: readonly string[]) => defineStubs(eventsListed(states));

/** An App Store Connect taking a patch of `event-1`, and echoing it. */
export const updating = defineStubs(eventUpdated);

/** An App Store Connect dropping `event-1`. */
export const deleting = defineStubs(eventDeleted);

/** An App Store Connect knowing no `event-9`. */
export const knowingNoEvent = defineStubs(eventMissing);

/** …where the card at `url`, served under `contentType`, is reserved as `fileName`, uploaded in two chunks and committed. */
export const withCard = (url: string, contentType: string, fileName: string) =>
    defineStubs(
        appStore,
        imageDownloaded(url, 'cardbytes', contentType),
        screenshotReserved({ assetType: 'EVENT_CARD', fileName, fileSize: 9, id: 'shot-card' }),
        chunkUploaded('https://uploads.example/shot-card/0', 'card', {
            'content-type': 'image/png',
        }),
        chunkUploaded('https://uploads.example/shot-card/1', 'bytes'),
        screenshotCommitted('shot-card'),
    );

/** …where the detail image of `url`, a PNG, fills the detail page slot the same way. */
export const withDetail = (url: string) =>
    defineStubs(
        appStore,
        imageDownloaded(url, 'detailbytes', 'image/png'),
        screenshotReserved({
            assetType: 'EVENT_DETAILS_PAGE',
            fileName: 'event-card.png',
            fileSize: 11,
            id: 'shot-detail',
        }),
        chunkUploaded('https://uploads.example/shot-detail/0', 'deta', {
            'content-type': 'image/png',
        }),
        chunkUploaded('https://uploads.example/shot-detail/1', 'ilbytes'),
        screenshotCommitted('shot-detail'),
    );

/** …where the artwork host knows nothing at `url`. */
export const withImageMissing = (url: string) => defineStubs(appStore, imageMissing(url));

/** …where the card at `url` is reserved, and the upload host refuses its first chunk. */
export const withChunkRefused = (url: string) =>
    defineStubs(
        appStore,
        imageDownloaded(url, 'cardbytes', 'image/png'),
        screenshotReserved({
            assetType: 'EVENT_CARD',
            fileName: 'event-card.png',
            fileSize: 9,
            id: 'shot-card',
        }),
        chunkRefused('https://uploads.example/shot-card/0'),
    );
