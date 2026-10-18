import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {rvoMatches,publicRvoValue} from '../lib/grid/rvo.ts';
const read=path=>JSON.parse(fs.readFileSync(new URL('../'+path,import.meta.url)));
const meta=read('data/operator-stations-meta.json');

test('operator exports preserve original attributes, source counts and unknown Stedin voltages',()=>{
 for(const layer of meta.datasets){
  const raw=zlib.gunzipSync(fs.readFileSync(new URL('../'+layer.archive,import.meta.url)));
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),layer.sha256);
  const original=JSON.parse(raw).pages.flatMap(p=>p.features);
  const features=read(`public/data/operator-stations/${layer.key}.geojson`).features;
  assert.equal(features.length,layer.count);assert.equal(original.length,layer.count);
  assert.equal(new Set(features.map(f=>f.properties.id)).size,layer.count);
  const byId=new Map(original.map(f=>[String(f.attributes.OBJECTID),f]));
  for(const f of features){
   const p=f.properties,a=byId.get(p.sourceObjectId)?.attributes;
   assert.ok(a);assert.equal(p.datasetKey,layer.key);
   assert.ok(!('capacityMw' in p)&&!('loadingMw' in p));
   assert.ok(f.geometry.coordinates.every(Number.isFinite));
   if(layer.provider==='liander'){
    assert.equal(p.voltage,String(a.SPANNINGSNIVEAUS??'').trim()||'Not tagged');
    assert.equal(p.operatorAssetId,String(a.ID??'').trim());
    if(a.NAAM?.trim())assert.equal(p.name,a.NAAM.trim());
   }else{
    assert.equal(p.voltage,'Not tagged');assert.equal(p.operatorAssetId,'');
    assert.match(p.locationQuality,/bounding box/);
   }
  }
 }
});

test('RVO filters keep installation types, status and withheld identities distinct',()=>{
 const d=read('public/data/rvo-projects.json');
 assert.equal(d.projects.length,28913);
 assert.equal(new Set(d.projects.map(p=>p.id)).size,d.projects.length);
 assert.equal(d.projects.filter(p=>rvoMatches(p,'','Solar','All','Ground-mounted')).length,976);
 assert.equal(d.projects.filter(p=>rvoMatches(p,'','Solar','All','Floating')).length,52);
 assert.equal(d.projects.filter(p=>rvoMatches(p,'','Offshore wind','All','All')).length,17);
 assert.ok(d.projects.filter(p=>rvoMatches(p,'','All','Not realised','All')).every(p=>p.realized===false));
 assert.equal(publicRvoValue('***'),'Not disclosed');
 assert.equal(publicRvoValue('9977**'),'Not disclosed');
 assert.ok(d.projects.every(p=>!('capacityMw' in p)&&!('coordinates' in p)));
 const notYet=d.projects.filter(p=>p.commissioningNote==='(Nog) niet');
 assert.equal(notYet.length,729);assert.ok(notYet.every(p=>p.commissioningYear===null));
});
