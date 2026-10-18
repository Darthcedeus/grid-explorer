import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {apiGuard,boundedText,acquireSourceLease,fetchWithoutRedirects} from '../lib/grid/security.ts';
import {nedPage} from '../lib/grid/ned.ts';
const identity={'oai-authenticated-user-id':'test-user','oai-authenticated-user-email':'test@example.invalid'};
test('API boundary rejects missing identity, cross-site browsers and oversized URLs',()=>{
 const req=(headers={},suffix='')=>new Request('https://grid.example/api/ned'+suffix,{headers});
 assert.equal(apiGuard(req())?.status,401);
 assert.equal(apiGuard(req({'oai-authenticated-user-id':'test-user'}))?.status,401);
 assert.equal(apiGuard(req({...identity,'sec-fetch-site':'cross-site'}))?.status,403);
 assert.equal(apiGuard(req({...identity,origin:'https://attacker.example'}))?.status,403);
 assert.equal(apiGuard(req({'oai-authenticated-user-email':'test@example.invalid'})),null);
 assert.equal(apiGuard(req(identity,'?q='+'x'.repeat(2100)))?.status,414);
 assert.equal(apiGuard(req({...identity,origin:'https://grid.example','sec-fetch-site':'same-origin'})),null);
});
test('Oversized and chunked provider bodies are rejected and streams cancelled',async()=>{
 let cancelled=false;
 const stream=()=>new ReadableStream({pull(c){c.enqueue(new Uint8Array(8));},cancel(){cancelled=true;}});
 await assert.rejects(boundedText(new Response(stream()),12),/size limit/);assert.equal(cancelled,true);
 cancelled=false;
 await assert.rejects(boundedText(new Response(stream(),{headers:{'content-length':'100'}}),12),/size limit/);assert.equal(cancelled,true);
 assert.equal(await boundedText(new Response('€'),3),'€');
 await assert.rejects(boundedText(new Response('€'),2),/size limit/);
});
test('Atomic provider lease rejects concurrent attempts and opens only at expiry',async()=>{
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec('CREATE TABLE source_cache (key TEXT PRIMARY KEY,artifact_id TEXT NOT NULL,expires_at INTEGER NOT NULL)');
 const db={prepare(sql){const statement=sqlite.prepare(sql);return {bind(...args){return {async first(){return statement.get(...args);}};}};}};
 try{
  const results=await Promise.all(Array.from({length:10},()=>acquireSourceLease(db,'ned',120000,1000)));
  assert.equal(results.filter(Boolean).length,1);
  assert.equal(await acquireSourceLease(db,'ned',120000,120999),false);
  assert.equal(await acquireSourceLease(db,'ned',120000,121000),true);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM source_cache').get().n,1);
 }finally{sqlite.close();}
});
test('Credentialed pagination rejects alternate origins and URL credentials',()=>{
 for(const url of ['https://evil.example/v1/utilizations','http://api.ned.nl/v1/utilizations','https://api.ned.nl.evil.example/v1/utilizations','https://api.ned.nl/other','https://user:pass@api.ned.nl/v1/utilizations']){
  assert.throws(()=>nedPage({member:[],view:{next:url}}));
 }
 assert.equal(nedPage({member:[],view:{next:'/v1/utilizations?page=2'}}).next,'https://api.ned.nl/v1/utilizations?page=2');
});

test('Provider fetch uses Workers-compatible manual mode and rejects every redirect',async(t)=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(input,init)=>{
  assert.equal(init.redirect,'manual');
  assert.equal(init.headers.apikey,'test-only');
  calls.push(input);
  const status=Number(new URL(input).searchParams.get('status'));
  return new Response([204,304].includes(status)?null:'provider response',{status,headers:{Location:'https://other.example/collect'}});
 });
 for(const status of [301,302,303,304,307,308]){
  await assert.rejects(fetchWithoutRedirects(`https://provider.example/?status=${status}`,{headers:{apikey:'test-only'}}),/redirect rejected/);
 }
 for(const status of [200,204,401,429,500]){
  const response=await fetchWithoutRedirects(`https://provider.example/?status=${status}`,{headers:{apikey:'test-only'}});
  assert.equal(response.status,status);
 }
 assert.equal(calls.length,11);
 assert.ok(calls.every(url=>new URL(url).hostname==='provider.example'));
});
