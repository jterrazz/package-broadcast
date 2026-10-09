import { defineStub, http } from '@jterrazz/test';

/** The upload host taking, at `url`, exactly the bytes of `chunk`, under `headers`. */
export default function chunkUploaded(
    url: string,
    chunk: string,
    headers: Record<string, string> = {},
) {
    return defineStub({
        request: http.put(url, { body: new RegExp(`^${chunk}$`, 'u'), headers }),
        required: true,
        response: http.empty(200),
        times: 1,
    });
}
