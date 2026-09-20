import { defineContract, http } from '@jterrazz/test';

/** App Store Connect failing on the event — once, so the next attempt meets a healthy API. */
export default defineContract({
    request: http.post('https://api.appstoreconnect.apple.com/v1/appEvents'),
    required: true,
    response: http.json({ errors: [{ detail: 'Internal Server Error' }] }, { status: 500 }),
    times: 1,
});
