import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {enexisMapData,profilePath,comparableEnexisAreas} from '../lib/grid/enexis.ts';
const read=p=>JSON.parse(fs.readFileSync(new URL('../public/data/enexis/'+p,import.meta.url)));
const capacity=read('capacity.json'),geometry=read('neighbourhoods-2026.geojson');
test('Enexis solar peak and large-connection inverter capacity retain distinct source units',()=>{
 const annen=capacity.snapshots.kv['2026-07-01'].find(r=>r.code==='BU16800000');
 assert.equal(annen.values.solarMwp,5.29);assert.equal(annen.values.connections,1577);assert.equal(annen.values.generatingConnections,1102);
 const large=capacity.snapshots.gv['2026-07-01'].find(r=>r.code==='BU00140000');
 assert.equal(large.values.solarMw,.418);assert.equal(large.values.windMw,0);
 assert.ok(!('solarMw' in annen.values)&&!('solarMwp' in large.values));
});
test('Unallocated and rejected area matches never acquire map geometry; zero remains zero',()=>{
 for(const [kind,dates] of Object.entries(capacity.snapshots))for(const rows of Object.values(dates)){
  const field=kind==='gv'?'windMw':'solarMwp',mapped=enexisMapData(geometry,rows,field);
  assert.equal(mapped.features.length,rows.filter(r=>r.mapped).length);
  const ids=new Set(mapped.features.map(f=>f.id));
  for(const r of rows)if(!r.mapped)assert.equal(ids.has(r.id),false);
  assert.ok(rows.filter(r=>!r.code).every(r=>!r.mapped));
 }
 const m=enexisMapData(geometry,capacity.snapshots.gv['2026-07-01'],'windMw');
 assert.equal(m.features.find(f=>f.id==='BU00140000').properties.value,0);
});
test('January and July remain independent releases, not a combined fleet total',()=>{
 assert.equal(capacity.snapshots.gv['2026-01-01'].length,2870);
 assert.equal(capacity.snapshots.gv['2026-07-01'].length,2875);
 assert.equal(capacity.snapshots.kv['2026-01-01'].length,4869);
 assert.equal(capacity.snapshots.kv['2026-07-01'].length,4892);
});
test('Station example keeps two missing hours per year and removes extrema footer rows',()=>{
 const p=read('hsms-profile.json');assert.equal(p.excludedRows,2);
 for(const year of p.years){assert.equal(year.values.length,8760);assert.equal(year.values[2138],null);assert.equal(year.values[2139],null);assert.equal(year.values.filter(x=>x===null).length,2);}
 const path=profilePath([2,null,-3],i=>i,v=>v);
 assert.equal((path.match(/M/g)||[]).length,2);assert.equal(path.includes('L'),false);
 assert.equal(p.years[0].maximumMw,100.3428872);assert.equal(p.years[2].minimumMw,-175.5180698);
});

test('Changed area labels in the published releases cannot create a comparable capacity delta',()=>{
 let changed=0,stable=0;
 for(const dates of Object.values(capacity.snapshots)){
  const jan=new Map(dates['2026-01-01'].map(r=>[r.id,r]));
  for(const july of dates['2026-07-01']){
   const before=jan.get(july.id);
   if(before&&(before.name!==july.name||before.municipality!==july.municipality)){assert.equal(comparableEnexisAreas(july,before),false);changed++;}
   if(before&&july.code&&before.name===july.name&&before.municipality===july.municipality){assert.equal(comparableEnexisAreas(july,before),true);stable++;}
   if(!july.code)assert.equal(comparableEnexisAreas(july,before),false);
  }
 }
 assert.ok(changed>0&&stable>0);
});
