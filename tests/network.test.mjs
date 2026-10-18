import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {networkMatches} from '../lib/grid/network.ts';
const data=JSON.parse(await readFile(new URL('../public/data/network.geojson',import.meta.url),'utf8'));
const meta=JSON.parse(await readFile(new URL('../data/network-meta.json',import.meta.url),'utf8'));
test('published infrastructure has unique source identities and valid geographic geometry',()=>{
 const ids=new Set();const counts={};
 for(const f of data.features){const p=f.properties;assert.ok(!ids.has(p.id));ids.add(p.id);assert.equal(p.sourceUrl,`https://www.openstreetmap.org/${p.id}`);assert.ok([110,150,220,380].includes(p.voltageKv));
  const coordinates=f.geometry.type==='Point'?[f.geometry.coordinates]:f.geometry.coordinates;
  if(p.kind!=='substation')assert.ok(coordinates.length>=2);
  for(const [lon,lat] of coordinates){assert.ok(Number.isFinite(lon)&&Number.isFinite(lat));assert.ok(lon>-180&&lon<180&&lat>-90&&lat<90);}
  counts[p.kind]=(counts[p.kind]||0)+1;
 }
 assert.deepEqual(counts,meta.counts);assert.equal(meta.license,'ODbL 1.0');assert.equal(ids.size,3448);
});
test('network filter combines operator search with selected voltage and never changes source records',()=>{
 const f=data.features.find(f=>f.properties.operator==='TenneT');assert.ok(f);
 assert.equal(networkMatches(f,'tennet',[f.properties.voltageKv]),true);
 assert.equal(networkMatches(f,'tennet',[]),false);
 assert.equal(networkMatches(f,'not-a-grid-operator',[f.properties.voltageKv]),false);
});
