import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir, stat} from 'node:fs/promises';
import {resolve} from 'node:path';

test('the production map references an emitted, self-contained worker asset', async () => {
  const root=resolve('dist/client');
  const chunks=await readdir(`${root}/_next/static/chunks`);
  const mapChunk=chunks.find(name=>/^grid-map-.*\.js$/.test(name));
  assert.ok(mapChunk, 'Map component must be in the client build');
  const source=await readFile(`${root}/_next/static/chunks/${mapChunk}`,'utf8');
  const url=source.match(/\/_next\/static\/maplibre-gl-worker-[\w-]+\.js/)?.[0];
  assert.ok(url, 'Use the bundler-emitted worker URL rather than relative discovery');
  const worker=resolve(root,`.${url}`);
  assert.ok((await stat(worker)).size>100000, 'Worker must include its shared runtime');
  const code=await readFile(worker,'utf8');
  assert.doesNotMatch(code,/from\s*["'`]\.\/maplibre-gl-shared/, 'No unshipped sibling module');
});
