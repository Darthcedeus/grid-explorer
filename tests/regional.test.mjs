import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {regionalValue} from '../lib/grid/regional.ts';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const raw=p=>JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(p,import.meta.url)))).value;
const data=read('../public/data/municipalities-2025.geojson');
test('2025 municipality joins retain official codes and annual quantities',()=>{
 const h=new Map(raw('../research/raw/households-2025.json.gz').map(x=>[x.WijkenEnBuurten.trim(),x]));
 const s=new Map(raw('../research/raw/solar-2025.json.gz').map(x=>[x.RegioS.trim(),x]));
 assert.equal(data.features.length,342);assert.equal(new Set(data.features.map(f=>f.id)).size,342);
 for(const f of data.features){const p=f.properties;assert.equal(p.year,2025);assert.equal(f.id,p.code);assert.ok(h.has(f.id));assert.ok(s.has(f.id));assert.equal(p.deliveryKwh,h.get(f.id).GemiddeldeElektriciteitslevering_5);assert.equal(p.netDeliveryKwh,h.get(f.id).GemiddeldeNettoElektriciteitslevering_6);assert.equal(p.solarMwp,s.get(f.id).OpgesteldVermogenVanZonnepanelen_2/1000);assert.equal(p.inverterMw,s.get(f.id).OpgesteldVermogenOmvormers_3/1000);assert.equal(p.installations,s.get(f.id).Installaties_1);assert.equal(f.geometry.type,'MultiPolygon');for(const xy of f.geometry.coordinates.flat(2))assert.ok(xy[0]>3&&xy[0]<8&&xy[1]>50&&xy[1]<54);}
 assert.ok(!data.features.some(f=>['GM0000','GM0998'].includes(f.id)));
});
test('missing statistics stay distinct from reported zero',()=>{assert.equal(regionalValue(null,'solarMwp'),'Not published');assert.equal(regionalValue(0,'solarMwp'),'0');});
