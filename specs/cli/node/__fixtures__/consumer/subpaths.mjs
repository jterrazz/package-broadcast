import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const imported = await import('@jterrazz/broadcast');
const required = require('@jterrazz/broadcast');

for (const [subpath, names] of [
    ['@jterrazz/broadcast (import)', Object.keys(imported)],
    ['@jterrazz/broadcast (require)', Object.keys(required)],
]) {
    console.log(`${subpath}: ${names.toSorted().join(', ')}`);
}
