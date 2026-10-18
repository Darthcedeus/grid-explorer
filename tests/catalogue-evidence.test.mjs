import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
test('enriched evidence is copied from the exact OSM object; highlighted station stays unknown',()=>{
 for(const name of ['producers','stations']){
  const raw=new Map(read(`research/raw/osm-${name}.json`).elements.map(e=>[`${e.type}/${e.id}`,e.tags]));
  const {features}=read(`public/data/${name}.geojson`);
  for(const f of features){const p=f.properties;for(const [key,value] of Object.entries(p.evidence))assert.equal(value,raw.get(p.id)[key],p.id+' '+key);}
  const coverage=read(`public/data/${name}-meta.json`).fieldCoverage;
  assert.equal(coverage.nameOrReference,features.filter(f=>!f.properties.name.startsWith('Unnamed')).length);
  assert.equal(coverage.operator,features.filter(f=>f.properties.operator!=='Not tagged').length);
  assert.equal(coverage.additionalEvidence,features.filter(f=>Object.keys(f.properties.evidence).length).length);
 }
 const highlighted=read('public/data/stations.geojson').features.find(f=>f.properties.id==='way/272533696').properties;
 assert.equal(highlighted.voltage,'Not tagged');
 assert.equal(highlighted.evidence['ref:bag'],'0617100000720403');
 assert.ok(!('loadMw' in highlighted));
});
test('solar peak ratings preserve explicit MWp/kWp/Wp units, separate from MW and output',()=>{
 const f=read('public/data/producers.geojson').features;
 const peak=f.filter(f=>f.properties.capacityPeakMwp!==null);
 assert.equal(peak.length,213);
 for(const {properties:p} of peak){
  const value=p.evidence['plant:output:electricity']||p.evidence['generator:output:electricity'];
  const m=value.match(/^\s*(\d+(?:\.\d+)?)\s*(MWp|kWp|Wp)\s*$/);
  assert.ok(m);assert.equal(p.technology,'Solar');assert.equal(p.capacityMw,null);
  assert.equal(p.capacityPeakMwp,Number(m[1])*{MWp:1,kWp:.001,Wp:.000001}[m[2]]);
  assert.ok(!('outputMw' in p));
 }
 assert.equal(f.filter(f=>f.properties.capacityMw===null&&f.properties.capacityPeakMwp===null).length,1663);
});
