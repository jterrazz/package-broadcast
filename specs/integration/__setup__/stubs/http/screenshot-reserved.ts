import { defineStub, http } from '@jterrazz/test';

type Reservation = {
    assetType: 'EVENT_CARD' | 'EVENT_DETAILS_PAGE';
    fileName: string;
    fileSize: number;
    id: string;
};

/** App Store Connect reserving a screenshot of `loc-1` and answering with two upload operations, of the first 4 bytes and of the rest. */
export default function screenshotReserved({ assetType, fileName, fileSize, id }: Reservation) {
    return defineStub({
        request: http.post('https://api.appstoreconnect.apple.com/v1/appEventScreenshots', {
            body: {
                data: {
                    attributes: { appEventAssetType: assetType, fileName, fileSize },
                    relationships: {
                        appEventLocalization: {
                            data: { id: 'loc-1', type: 'appEventLocalizations' },
                        },
                    },
                    type: 'appEventScreenshots',
                },
            },
        }),
        required: true,
        response: http.json(
            {
                data: {
                    attributes: {
                        uploadOperations: [
                            {
                                length: 4,
                                method: 'PUT',
                                offset: 0,
                                requestHeaders: [{ name: 'Content-Type', value: 'image/png' }],
                                url: `https://uploads.example/${id}/0`,
                            },
                            {
                                length: fileSize - 4,
                                method: 'PUT',
                                offset: 4,
                                requestHeaders: [],
                                url: `https://uploads.example/${id}/1`,
                            },
                        ],
                    },
                    id,
                    type: 'appEventScreenshots',
                },
            },
            { status: 201 },
        ),
        times: 1,
    });
}
