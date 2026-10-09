import { defineStub, http } from '@jterrazz/test';

/** The artwork host knowing nothing at `url`. */
export default function imageMissing(url: string) {
    return defineStub({
        request: http.get(url),
        required: true,
        response: http.text('Not Found', { status: 404 }),
    });
}
