/**
 * The failure an App Store Connect call raises when the API refuses it.
 * It carries the HTTP status and the raw response body, so a rejection stays
 * debuggable once it has crossed the adapter's boundary.
 */
class AppleAppStoreError extends Error {
    readonly statusCode: number;
    readonly responseBody: string;

    constructor(message: string, statusCode: number, responseBody: string) {
        super(message);
        this.name = 'AppleAppStoreError';
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }
}

export { AppleAppStoreError };
