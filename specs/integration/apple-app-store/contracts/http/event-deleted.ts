import { defineContract, http } from '@jterrazz/test';

/** App Store Connect dropping the event — a 204 with nothing to read. */
export default defineContract({
    request: http.delete('https://api.appstoreconnect.apple.com/v1/appEvents/event-1'),
    required: true,
    response: http.empty(),
});
