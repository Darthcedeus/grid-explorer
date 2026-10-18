import test from 'node:test';
import assert from 'node:assert/strict';
import {nedPage} from '../lib/grid/ned.ts';
test('NED collection pagination supports both JSON-LD key forms',()=>{
 assert.deepEqual(nedPage({'hydra:member':[1],'hydra:view':{'hydra:next':'/v1/utilizations?page=2'}}),{rows:[1],next:'https://api.ned.nl/v1/utilizations?page=2'});
 assert.deepEqual(nedPage({member:[],view:{}}),{rows:[],next:null});
});
test('upstream pagination cannot send the API key to another destination',()=>{
 for(const next of ['https://example.org/v1/utilizations','//example.org/v1/utilizations','https://api.ned.nl/other'])assert.throws(()=>nedPage({member:[],view:{next}}));
 assert.throws(()=>nedPage({error:'Access denied'}));
});
