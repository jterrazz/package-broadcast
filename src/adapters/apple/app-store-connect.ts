import { AppleAppStoreError } from './apple-app-store.error.js';

const BASE_URL = 'https://api.appstoreconnect.apple.com/v1';

type Method = 'DELETE' | 'GET' | 'PATCH' | 'POST';

/** Calls `method` on the App Store Connect API's `path` under `token`, with `body` as JSON, answering the JSON it returns, or nothing for a 204, and raising its refusal as an `AppleAppStoreError`. */
export async function callAppStoreConnect(
    token: string,
    method: Method,
    path: string,
    body?: unknown,
): Promise<unknown> {
    const response = await fetch(`${BASE_URL}${path}`, {
        // outside: JSON.stringify(undefined) is undefined, which fetch sends as no body.
        body: JSON.stringify(body),
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        method,
    });

    if (!response.ok) {
        throw new AppleAppStoreError(
            `App Store Connect API error: ${response.status} ${response.statusText}`,
            response.status,
            await response.text(),
        );
    }

    return response.status === 204 ? undefined : await response.json();
}
