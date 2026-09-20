import { defineContract, http } from '@jterrazz/test';

/** App Store Connect accepting an in-app event, and naming it `event-1`. */
export default defineContract({
    request: http.post('https://api.appstoreconnect.apple.com/v1/appEvents', {
        body: { data: { attributes: { referenceName: 'Spring Event' }, type: 'appEvents' } },
        headers: { authorization: /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/u },
    }),
    required: true,
    response: http.json(
        {
            data: {
                attributes: { badge: 'SPECIAL_EVENT', eventState: 'DRAFT' },
                id: 'event-1',
                type: 'appEvents',
            },
        },
        { status: 201 },
    ),
});
