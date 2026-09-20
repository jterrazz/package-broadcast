import { defineContract, http } from '@jterrazz/test';

/** The app's in-app events, carrying the one a create has just put there. */
export default defineContract({
    request: http.get('https://api.appstoreconnect.apple.com/v1/apps/6444444444/appEvents'),
    required: true,
    response: http.json({
        data: [
            {
                attributes: {
                    badge: 'SPECIAL_EVENT',
                    eventState: 'DRAFT',
                    referenceName: 'Spring Event',
                },
                id: 'event-1',
                type: 'appEvents',
            },
        ],
    }),
});
