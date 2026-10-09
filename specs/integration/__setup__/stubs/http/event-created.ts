import { defineStub, http } from '@jterrazz/test';

/** App Store Connect accepting, under a signed token, an event of the app whose attributes hold `attributes`, and naming it `event-1`. */
export default function eventCreated(attributes: object = {}) {
    return defineStub({
        request: http.post('https://api.appstoreconnect.apple.com/v1/appEvents', {
            body: {
                data: {
                    attributes,
                    relationships: { app: { data: { id: '6444444444', type: 'apps' } } },
                    type: 'appEvents',
                },
            },
            headers: {
                authorization: /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/u,
                'content-type': 'application/json',
            },
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
        times: 1,
    });
}
