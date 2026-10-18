import { defineStub, http } from '@jterrazz/test/stubs';

/** App Store Connect refusing an event of the app `appId` with a 422 and the reason it gives. */
export default function eventRefused(appId: string) {
    return defineStub({
        request: http.post('https://api.appstoreconnect.apple.com/v1/appEvents', {
            body: { data: { relationships: { app: { data: { id: appId } } } } },
        }),
        required: true,
        response: http.json(
            { errors: [{ code: 'ENTITY_ERROR.ATTRIBUTE.INVALID', detail: 'deepLink is invalid' }] },
            { status: 422 },
        ),
    });
}
