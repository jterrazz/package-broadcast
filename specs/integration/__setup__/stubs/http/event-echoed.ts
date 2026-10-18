import { defineStub, http } from '@jterrazz/test/stubs';

/** App Store Connect taking, under a signed token, any event, answering with its id `event-1` alone and echoing the body it received. */
export default defineStub({
    request: http.post('https://api.appstoreconnect.apple.com/v1/appEvents', {
        headers: {
            authorization: /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/u,
            'content-type': 'application/json',
        },
    }),
    required: true,
    response: (request) =>
        http.json(
            { data: { id: 'event-1', type: 'appEvents' }, received: request.body },
            { status: 201 },
        ),
    times: 1,
});
