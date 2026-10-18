import test from 'node:test';import assert from 'node:assert/strict';
import {sortRegions,regionsCsv} from '../lib/grid/comparison.ts';
import {balancingPath} from '../lib/grid/balancing-chart.ts';
const f=(code,name,value)=>({id:code,properties:{code,name,year:2025,deliveryKwh:value,netDeliveryKwh:null,solarMwp:0,inverterMw:0,installations:0}});
test('comparison sorts copies with missing last and keeps measured zero',()=>{const rows=[f('a','Alpha',null),f('b','Beta',20),f('c','Gamma',0)];assert.deepEqual(sortRegions(rows,'deliveryKwh','highest').map(x=>x.id),['b','c','a']);assert.deepEqual(sortRegions(rows,'deliveryKwh','lowest').map(x=>x.id),['c','b','a']);assert.equal(rows[0].id,'a');});
test('CSV preserves units, nulls, quoting and formula safety',()=>{const csv=regionsCsv([f('GM1','=TEST("x")',null)]);assert.match(csv,/solarPanelCapacityMWp/);assert.match(csv,/"'=TEST\(""x""\)"/);assert.match(csv,/"2025","","","0"/);});
test('balancing trend does not bridge absent intervals or null values',()=>{const row=(start,end,value)=>({start:new Date(start).toISOString(),end:new Date(end).toISOString(),values:{v:value}});const p=balancingPath([row(0,12,1),row(12,24,2),row(36,48,3),row(48,60,null),row(60,72,4)],'v',x=>x,y=>y);assert.equal((p.match(/M/g)||[]).length,3);assert.equal((p.match(/L/g)||[]).length,1);});
