import { describe, expect, test } from 'vitest';

import { AppleAppStoreAdapter } from '../../../src/index.js';
import { APP, springEvent } from '../__setup__/app-store-connect.js';
import {
    appStore,
    withCard,
    withChunkRefused,
    withDetail,
    withHeaderlessUpload,
    withImageMissing,
    withNothingToUpload,
} from '../__setup__/stubs/app-store.stubs.js';
import { integration } from '../integration.specification.js';

const CREATED = {
    id: 'event-1',
    provider: 'apple-app-store',
    raw: {
        data: {
            attributes: { badge: 'SPECIAL_EVENT', eventState: 'DRAFT' },
            id: 'event-1',
            type: 'appEvents',
        },
    },
    status: 'created',
};

describe('images', () => {
    test.each([
        ['image/jpeg', 'event-card.jpg'],
        ['image/jpg', 'event-card.jpg'],
        ['image/png', 'event-card.png'],
        ['image/webp', 'event-card.png'],
    ])('uploads a card served as %s under the name %s', async (contentType, fileName) => {
        // Given - an artwork host serving the card, and an App Store Connect reserving, taking and committing it
        const result = await integration
            .intercept(withCard('https://cdn.example/spring-card', contentType, fileName))
            .call(
                async () =>
                    await new AppleAppStoreAdapter(APP).create(
                        springEvent({ cardImageUrl: 'https://cdn.example/spring-card' }),
                    ),
            );

        // Then - the event was created with its card committed
        expect(result.value).toMatch(CREATED);
    });

    test('uploads the detail image into the detail page slot', async () => {
        // Given - an artwork host serving the detail image, and an App Store Connect taking it
        const result = await integration
            .intercept(withDetail('https://cdn.example/spring-detail.png'))
            .call(
                async () =>
                    await new AppleAppStoreAdapter(APP).create(
                        springEvent({ detailImageUrl: 'https://cdn.example/spring-detail.png' }),
                    ),
            );

        // Then - the event was created with its detail image committed
        expect(result.value).toMatch(CREATED);
    });

    test.each([
        ['an operation naming no header', withHeaderlessUpload],
        ['no upload operation', withNothingToUpload],
    ])('commits a card App Store Connect reserved with %s', async (_, world) => {
        // Given - an App Store Connect answering the card's reservation without what it may leave out
        const result = await integration
            .intercept(world('https://cdn.example/spring-card.png'))
            .call(
                async () =>
                    await new AppleAppStoreAdapter(APP).create(
                        springEvent({ cardImageUrl: 'https://cdn.example/spring-card.png' }),
                    ),
            );

        // Then - the event was created with its card committed
        expect(result.value).toMatch(CREATED);
    });

    test('uploads nothing for an image URL left empty', async () => {
        // Given - an App Store Connect serving the event and its localization, and no other host
        const result = await integration
            .intercept(appStore)
            .call(
                async () =>
                    await new AppleAppStoreAdapter(APP).create(
                        springEvent({ cardImageUrl: '', detailImageUrl: '' }),
                    ),
            );

        // Then - the event was created without reaching for an image
        expect(result.value).toMatch(CREATED);
    });

    test('refuses a card the artwork host does not serve, once the event exists', async () => {
        // Given - an artwork host knowing nothing at the card's URL
        const result = await integration
            .intercept(withImageMissing('https://cdn.example/gone.png'))
            .call(
                async () =>
                    await new AppleAppStoreAdapter(APP).create(
                        springEvent({ cardImageUrl: 'https://cdn.example/gone.png' }),
                    ),
            );

        // Then - the create is refused with the URL and the status
        expect(result.error).toMatch(
            'Failed to download image from https://cdn.example/gone.png: 404',
        );
    });

    test('refuses a card whose chunk the upload host refuses', async () => {
        // Given - an upload host refusing the card's first chunk
        const result = await integration
            .intercept(withChunkRefused('https://cdn.example/spring-card.png'))
            .call(
                async () =>
                    await new AppleAppStoreAdapter(APP).create(
                        springEvent({ cardImageUrl: 'https://cdn.example/spring-card.png' }),
                    ),
            );

        // Then - the create is refused with the upload host's status
        expect(result.error).toMatch('Failed to upload image chunk: 503 Service Unavailable');
    });
});
