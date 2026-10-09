import { defineStub, http } from '@jterrazz/test';

/** The English localization of `event-1`, carrying the broadcast's title and both descriptions, named `loc-1`. */
export default defineStub({
    request: http.post('https://api.appstoreconnect.apple.com/v1/appEventLocalizations', {
        body: {
            data: {
                attributes: {
                    locale: 'en-US',
                    longDescription:
                        'Join us for a special live event with exclusive content and prizes.',
                    name: 'Spring Event',
                    shortDescription: 'Live event this weekend!',
                },
                relationships: { appEvent: { data: { id: 'event-1', type: 'appEvents' } } },
                type: 'appEventLocalizations',
            },
        },
    }),
    required: true,
    response: http.json({ data: { id: 'loc-1', type: 'appEventLocalizations' } }, { status: 201 }),
    times: 1,
});
