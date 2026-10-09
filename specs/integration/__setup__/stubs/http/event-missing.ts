import { defineStub, http } from '@jterrazz/test';

/** App Store Connect knowing no event `event-9`. */
export default defineStub({
    request: http.delete('https://api.appstoreconnect.apple.com/v1/appEvents/event-9'),
    required: true,
    response: http.json(
        { errors: [{ code: 'NOT_FOUND', detail: 'There is no resource with id event-9' }] },
        { status: 404 },
    ),
});
