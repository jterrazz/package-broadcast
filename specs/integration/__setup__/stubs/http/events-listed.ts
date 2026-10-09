import { defineStub, http } from '@jterrazz/test';

/** The app's in-app events, one per state in `states`, named `event-1` onwards in that order. */
export default function eventsListed(states: readonly string[]) {
    return defineStub({
        request: http.get('https://api.appstoreconnect.apple.com/v1/apps/6444444444/appEvents'),
        required: true,
        response: http.json({
            data: states.map((eventState, index) => ({
                attributes: {
                    badge: 'LIVE_EVENT',
                    eventState,
                    referenceName: `Event ${index + 1}`,
                },
                id: `event-${index + 1}`,
                type: 'appEvents',
            })),
        }),
    });
}
