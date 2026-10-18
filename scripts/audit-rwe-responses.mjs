// Validate complete saved provider responses; this does not test hosted access.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {rwePlants,rweHistory,rweLive} from '../lib/grid/rwe.ts';
const root=new URL('../research/cross-check/rwe/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,root)));
const plants=rwePlants(read('master.json')),live=rweLive(read('live.json'));
const histories=[];
for(const file of ['claus-history.json','magnum-history.json','nl-wind-history.json','nl-gas-history.json']){
 const raw=read(file),points=rweHistory(raw,raw.id);
 const plant=plants.find(p=>p.id===raw.id);
 if(!plant&&!file.startsWith('nl-'))throw Error('History absent from Dutch master: '+file);
 histories.push({file,id:raw.id,plant:plant?.name||'Empty aggregate-query response; no national observations',intervals:points.length,missing:points.filter(p=>p.mw===null).length,first:points[0]?.time,last:points.at(-1)?.time});
}
const nationalTimes=new Set(['energy-power.json','energy-power-today.json'].flatMap(file=>JSON.parse(fs.readFileSync(new URL('../data/'+file,import.meta.url))).data.map(p=>new Date(p.timestamp).toISOString())));
const commonWithSavedNational=histories.filter(h=>h.id!==null).map(h=>({plant:h.plant,commonIntervals:rweHistory(read(h.file),h.id).filter(p=>nationalTimes.has(p.time)).length}));
const hashes=fs.readdirSync(root).filter(f=>f.endsWith('.json')).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex')}));
const units=plants.flatMap(p=>p.units);
const result={checkedAt:new Date().toISOString(),scope:'Complete locally saved research responses. Not a successful hosted fetch or a fresh upstream download. sums.json is retained and hashed only; it is not used by the application.',dutchPlants:plants.length,dutchUnits:units.length,unitsAbsentFromLiveResponse:units.filter(u=>!(u.id in live)).map(u=>u.id),commonWithSavedNational,nullUnitReadings:units.filter(u=>u.id in live&&live[u.id]===null).length,histories,hashes,limits:'ISO/epoch timestamps and duplicate times validated. Live values have no observation timestamp and are not reconciled to history or added to national totals.'};
fs.writeFileSync(new URL('../research/cross-check/rwe-response-validation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
