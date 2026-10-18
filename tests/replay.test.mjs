import {test} from 'node:test';
import assert from 'node:assert/strict';
import {borderFlow,replayScale,intervalDelta} from '../lib/grid/replay.ts';
test('flow direction follows import sign; unknown and zero never move',()=>{
 const incoming=borderFlow('germany',1200),outgoing=borderFlow('germany',-1200);
 assert.deepEqual(incoming.coordinates[1],[5.25,52.35]);
 assert.deepEqual(outgoing.coordinates,[...incoming.coordinates].reverse());
 assert.equal(incoming.width,outgoing.width);
 assert.ok(borderFlow('germany',2400).width>incoming.width);
 assert.equal(borderFlow('germany',0).moving,false);
 for(const value of [null,undefined,NaN,Infinity])assert.equal(borderFlow('germany',value),null);
 assert.equal(borderFlow('unknown',10),null);
});
test('replay uses one day scale and does not report changes across gaps',()=>{
 const a={start:'2026-09-18T00:00:00Z',end:'2026-09-18T00:15:00Z',generation:1100,load:2000,netImports:-3000};
 const b={...a,start:a.end,end:'2026-09-18T00:30:00Z',generation:1400,load:null};
 assert.equal(replayScale([a,b]),3000);
 assert.equal(intervalDelta(b,a,'generation'),300);
 assert.equal(intervalDelta(b,a,'load'),null);
 assert.equal(intervalDelta(b,undefined,'generation'),null);
 assert.equal(intervalDelta({...b,start:'2026-09-18T01:00:00Z'},a,'generation'),null);
});
