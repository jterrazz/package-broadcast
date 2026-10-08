/** The refusal of an App Store Connect call, carrying the HTTP status and the raw response body. */
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
