import { defineContract, http } from '@jterrazz/test';

/** App Store Connect accepting a patch that raises the event's priority. */
export default defineContract({
    request: http.patch('https://api.appstoreconnect.apple.com/v1/appEvents/event-1', {
        body: {
            data: { attributes: { priority: 'HIGH' }, id: 'event-1', type: 'appEvents' },
        },
    }),
    required: true,
    response: http.json({
        data: {
            attributes: { badge: 'SPECIAL_EVENT', eventState: 'DRAFT' },
            id: 'event-1',
            type: 'appEvents',
        },
    }),
});
