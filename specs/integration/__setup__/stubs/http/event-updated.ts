import { defineStub, http } from '@jterrazz/test';

/** App Store Connect taking a patch of `event-1`, now waiting for review, its answer echoing the body it received. */
export default defineStub({
    request: http.patch('https://api.appstoreconnect.apple.com/v1/appEvents/event-1'),
    required: true,
    response: (request) =>
        http.json({
            data: {
                attributes: { badge: 'SPECIAL_EVENT', eventState: 'WAITING_FOR_REVIEW' },
                id: 'event-1',
                type: 'appEvents',
            },
            received: request.body,
        }),
});
