import { defineStub, http } from '@jterrazz/test';

/** App Store Connect marking the screenshot `id` uploaded. */
export default function screenshotCommitted(id: string) {
    return defineStub({
        request: http.patch(`https://api.appstoreconnect.apple.com/v1/appEventScreenshots/${id}`, {
            body: { data: { attributes: { uploaded: true }, id, type: 'appEventScreenshots' } },
        }),
        required: true,
        response: http.json({ data: { attributes: {}, id, type: 'appEventScreenshots' } }),
        times: 1,
    });
}
