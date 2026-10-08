import { callAppStoreConnect } from './app-store-connect.js';
import { AppleScreenshotSchema, readAnswer } from './apple-app-store.schemas.js';

type AssetType = 'EVENT_CARD' | 'EVENT_DETAILS_PAGE';

async function download(imageUrl: string) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to download image from ${imageUrl}: ${response.status}`);
    }

    const extension = /jpe?g/u.test(String(response.headers.get('content-type'))) ? 'jpg' : 'png';

    return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        fileName: `event-card.${extension}`,
    };
}

async function reserve(
    token: string,
    localizationId: string,
    assetType: AssetType,
    image: { bytes: Uint8Array; fileName: string },
) {
    const answer = await callAppStoreConnect(token, '/appEventScreenshots', {
        method: 'POST',
        body: {
            data: {
                attributes: {
                    appEventAssetType: assetType,
                    fileName: image.fileName,
                    fileSize: image.bytes.byteLength,
                },
                relationships: {
                    appEventLocalization: {
                        data: { id: localizationId, type: 'appEventLocalizations' },
                    },
                },
                type: 'appEventScreenshots',
            },
        },
    });

    return readAnswer(AppleScreenshotSchema, answer).data;
}

/** Downloads the image at `imageUrl` into the `assetType` slot of the localization: reserved, uploaded as App Store Connect's operations say, committed. */
export async function uploadEventImage(
    token: string,
    localizationId: string,
    imageUrl: string,
    assetType: AssetType,
): Promise<void> {
    const image = await download(imageUrl);
    const screenshot = await reserve(token, localizationId, assetType, image);

    for (const operation of screenshot.attributes.uploadOperations) {
        const response = await fetch(operation.url, {
            body: image.bytes.slice(operation.offset, operation.offset + operation.length),
            headers: Object.fromEntries(
                operation.requestHeaders.map(({ name, value }) => [name, value]),
            ),
            method: operation.method,
        });

        if (!response.ok) {
            throw new Error(
                `Failed to upload image chunk: ${response.status} ${response.statusText}`,
            );
        }
    }

    await callAppStoreConnect(token, `/appEventScreenshots/${screenshot.id}`, {
        body: {
            data: {
                attributes: { uploaded: true },
                id: screenshot.id,
                type: 'appEventScreenshots',
            },
        },
        method: 'PATCH',
    });
}
