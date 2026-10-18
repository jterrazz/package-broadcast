import { defineStub, http } from '@jterrazz/test/stubs';

/** The upload host refusing whatever reaches `url`. */
export default function chunkRefused(url: string) {
    return defineStub({
        request: http.put(url),
        required: true,
        response: http.text('Service Unavailable', { status: 503 }),
    });
}
