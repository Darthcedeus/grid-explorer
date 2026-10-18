import test from 'node:test';
import assert from 'node:assert/strict';
import {dutchDay,validObservationDay,previousDay,latestIntervalIndex,resolveDataset} from '../lib/grid/freshness.ts';
import {scenario} from '../lib/grid/domain.ts';
test('date validation rejects rollover and future dates without an arbitrary history floor',()=>{
 assert.equal(validObservationDay('2026-02-30','2026-09-18'),false);
 assert.equal(validObservationDay('2026-09-19','2026-09-18'),false);
 assert.equal(validObservationDay('2024-02-29','2026-09-18'),true);
 assert.equal(validObservationDay('2026-2-01','2026-09-18'),false);
 assert.equal(dutchDay(new Date('2026-09-17T23:00Z')),'2026-09-18');
 assert.equal(previousDay('2026-03-30'),'2026-03-29');
});
test('startup chooses a complete elapsed interval, not a future or incomplete tail',()=>{
 const d=scenario();d.intervals[94].missing=['load'];
 assert.equal(latestIntervalIndex(d,Date.parse(d.intervals[94].end)),93);
 d.intervals.forEach(i=>i.missing=['load']);
 assert.equal(latestIntervalIndex(d,Date.parse(d.intervals[94].end)),94);
});
test('latest mode tries yesterday and explicitly reports the changed day',async()=>{
 const calls=[];const d=scenario();const result=await resolveDataset('2026-09-18',true,async day=>{calls.push(day);if(day.endsWith('18'))throw Error('outage');return d;},()=>{throw Error('Unexpected fallback');});
 assert.deepEqual(calls,['2026-09-18','2026-09-17']);assert.match(result.retrieval.fallbackReason,/Showing 2026-09-17/);assert.equal(result.retrieval.requestedDay,'2026-09-18');
});
test('explicit historic date never silently fetches a different live day',async()=>{
 const calls=[];const d=scenario();const result=await resolveDataset('2024-05-01',false,async day=>{calls.push(day);throw Error('unavailable');},()=>d);
 assert.deepEqual(calls,['2024-05-01']);assert.match(result.retrieval.fallbackReason,/saved 2026-09-17 snapshot/);assert.equal(result.fetchedAt,d.fetchedAt);
});
test('cached failure reason and original retrieval age are preserved',async()=>{
 const d={...scenario(),retrieval:{powerFetchedAt:'2026-09-16T12:00:00Z',fallbackReason:'Older archive used'}};
 const result=await resolveDataset('2026-09-17',true,async()=>d,()=>{throw Error();});
 assert.equal(result.retrieval.powerFetchedAt,d.retrieval.powerFetchedAt);assert.equal(result.retrieval.fallbackReason,'Older archive used');
});
