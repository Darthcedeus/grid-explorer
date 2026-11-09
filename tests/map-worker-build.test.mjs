import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir, stat} from 'node:fs/promises';
import {resolve} from 'node:path';

// Vinext 1.0 emitted named chunks (grid-map-*, maplibre-gl-worker-*); later
// versions emit hash-only chunks and put workers under /_next/static/workers/.
const workerUrl=/\/_next\/static\/(?:maplibre-gl-worker-[\w-]+|workers\/[\w-]+)\.js/;

test('the production map references an emitted, self-contained worker asset', async () => {
  const root=resolve('dist/client');
  const dir=`${root}/_next/static/chunks`;
  let url;
  for (const name of (await readdir(dir)).filter(name=>name.endsWith('.js'))) {
    const source=await readFile(`${dir}/${name}`,'utf8');
    if (source.includes('setWorkerUrl')) url??=source.match(workerUrl)?.[0];
  }
  assert.ok(url, 'Use the bundler-emitted worker URL rather than relative discovery');
  const worker=resolve(root,`.${url}`);
  assert.ok((await stat(worker)).size>100000, 'Worker must include its shared runtime');
  const code=await readFile(worker,'utf8');
  assert.doesNotMatch(code,/from\s*["'`]\.\/maplibre-gl-shared/, 'No unshipped sibling module');
});
