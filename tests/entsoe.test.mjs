import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeEntsoe,entsoeWindow,entsoeQuery} from '../lib/grid/entsoe.ts';
const fixture=p=>fs.readFileSync(new URL(`./fixtures/entsoe/${p}.xml`,import.meta.url),'utf8');
const day='2026-10-26';
test('authenticated Dutch fixtures retain decimal load, fuel directions, forecasts and prices',()=>{
 for(const product of ['load','loadForecast','generation','renewablesForecast','prices']){
  const d=normalizeEntsoe(fixture(product),product,day);assert.ok(d.documentId);assert.equal(d.series[0].points.length,96);assert.equal(d.series[0].points[0].start,'2026-10-25T23:00:00.000Z');assert.equal(d.series[0].points.at(-1).end,'2026-10-26T23:00:00.000Z');
 }
 const d=normalizeEntsoe(fixture('generation'),'generation',day);assert.equal(d.series.length,20);assert.equal(d.series.filter(s=>s.direction==='generation').length,10);assert.equal(d.series.filter(s=>s.direction==='consumption').length,10);
 assert.equal(normalizeEntsoe(fixture('renewablesForecast'),'renewablesForecast',day).series.length,3);
 assert.equal(normalizeEntsoe(fixture('prices'),'prices',day).series[0].unit,'EUR/MWh');
 const negative=fixture('prices').replace(/<price.amount>[^<]+<\/price.amount>/,'<price.amount>-12.5</price.amount>');assert.equal(normalizeEntsoe(negative,'prices',day).series[0].points[0].value,-12.5);
 const load=normalizeEntsoe(fixture('load'),'load',day).series[0].points;assert.ok(load.some(p=>p.value!==Math.trunc(p.value)));
});
const xml=(curve,points)=>`<GL_MarketDocument><mRID>test</mRID><revisionNumber>2</revisionNumber><type>A65</type><process.processType>A16</process.processType><TimeSeries><mRID>1</mRID><outBiddingZone_Domain.mRID>10YNL----------L</outBiddingZone_Domain.mRID><quantity_Measure_Unit.name>MAW</quantity_Measure_Unit.name><curveType>${curve}</curveType><Period><timeInterval><start>2026-10-26T00:00Z</start><end>2026-10-26T01:00Z</end></timeInterval><resolution>PT15M</resolution>${points}</Period></TimeSeries></GL_MarketDocument>`;
const point=(p,v)=>`<Point><position>${p}</position>${v===null?'':`<quantity>${v}</quantity>`}</Point>`;
test('A03 block expansion stops on missing quantity; A01 gaps stay null, zero is observed',()=>{
 const a=normalizeEntsoe(xml('A03',point(2,1.25)+point(4,null)),'load',day);assert.deepEqual(a.series[0].points.map(p=>p.value),[null,1.25,1.25,null]);
 assert.deepEqual(normalizeEntsoe(xml('A01',point(1,0)+point(3,2)),'load',day).series[0].points.map(p=>p.value),[0,null,2,null]);
});
test('unsupported contracts, entities, duplicate positions and overlapping periods fail closed',()=>{
 for(const body of [xml('A02',point(1,1)),xml('A01',point(2,2)+point(2,3)),xml('A01',point(5,1)),xml('A01',point(1,'NaN')),xml('A01',point(1,1)).replace('MAW','MWH'),xml('A01',point(1,1)).replace('10YNL----------L','wrong'),'<broken>',`<!DOCTYPE x [<!ENTITY a 'x'>]>${xml('A01',point(1,1))}`])assert.throws(()=>normalizeEntsoe(body,'load',day));
 const valid=xml('A01',point(1,1));const period=valid.match(/<Period>[\s\S]*<\/Period>/)[0];assert.throws(()=>normalizeEntsoe(valid.replace('</TimeSeries>',period+'</TimeSeries>'),'load',day));
});
test('acknowledgement 999 is empty only for explicit no-matching-data, never generic rejection',()=>{
 assert.equal(normalizeEntsoe('<Acknowledgement_MarketDocument><Reason><code>999</code><text>No matching data found</text></Reason></Acknowledgement_MarketDocument>','load',day).series.length,0);
 assert.throws(()=>normalizeEntsoe('<Acknowledgement_MarketDocument><Reason><code>999</code><text>Invalid query</text></Reason></Acknowledgement_MarketDocument>','load',day));
});
test('Amsterdam DST dates use 23 and 25 hours; queries are exact, credential-free and product specific',()=>{
 for(const [d,hours] of [['2026-03-29',23],['2026-10-25',25],['2026-10-26',24]]){const w=entsoeWindow(d);assert.equal((Date.parse(w.end)-Date.parse(w.start))/3600000,hours);}
 assert.throws(()=>entsoeWindow('2026-02-30'));assert.throws(()=>entsoeWindow('bad'));
 const p=entsoeQuery('prices',day);assert.equal(p.get('periodStart'),'202610252300');assert.equal(p.get('periodEnd'),'202610262300');assert.equal(p.get('out_Domain'),'10YNL----------L');assert.equal(p.has('securityToken'),false);
});
