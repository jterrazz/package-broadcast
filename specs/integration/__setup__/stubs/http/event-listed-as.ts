import { defineStub, http } from '@jterrazz/test';

/** The app's in-app events: one, written as `event`. */
export default function eventListedAs(event: object) {
    return defineStub({
        request: http.get('https://api.appstoreconnect.apple.com/v1/apps/6444444444/appEvents'),
        required: true,
        response: http.json({ data: [event] }),
    });
}
