import { defineContract, http } from '@jterrazz/test';

/** The English localization, attached to the event the create answered with. */
export default defineContract({
    request: http.post('https://api.appstoreconnect.apple.com/v1/appEventLocalizations', {
        body: {
            data: {
                attributes: { locale: 'en-US', name: 'Spring Event' },
                relationships: { appEvent: { data: { id: 'event-1' } } },
                type: 'appEventLocalizations',
            },
        },
    }),
    required: true,
    response: http.json({ data: { id: 'loc-1', type: 'appEventLocalizations' } }, { status: 201 }),
});
