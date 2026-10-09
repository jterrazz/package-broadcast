import { directory, packed } from '@jterrazz/test';
import { describe, expect, test } from 'vitest';

import { cli } from '../cli.specification.js';

describe('declarations', () => {
    test('a consumer compiles against the declarations the tarball ships', async () => {
        // Given - a consumer's channel and broadcast, with the compiler and the Node types beside the packed package
        const result = await cli
            .fixture(directory('./__fixtures__/consumer/'))
            .link('@jterrazz/broadcast', packed())
            .link('typescript')
            .link('@types/node')
            .exec('node_modules/typescript/bin/tsc -p .');

        // Then - the port, the model and the adapter type-check, an unknown badge is refused where the consumer expects it, and the compiler reports nothing
        expect(result.exitCode).toBe(0);
        expect(result.stdout.text).toBe('');
    });
});
