import { defineStub, http } from '@jterrazz/test/stubs';

/** App Store Connect dropping `event-1`: a 204 with nothing to read. */
export default defineStub({
    request: http.delete('https://api.appstoreconnect.apple.com/v1/appEvents/event-1'),
    required: true,
    response: http.empty(),
});
