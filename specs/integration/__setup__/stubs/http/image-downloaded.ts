import { defineStub, http } from '@jterrazz/test/stubs';

/** The artwork host serving `url` as `body`, under `contentType`. */
export default function imageDownloaded(url: string, body: string, contentType: string) {
    return defineStub({
        request: http.get(url),
        required: true,
        response: http.text(body, { headers: { 'content-type': contentType } }),
    });
}
