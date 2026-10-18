import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {SqliteArchive} from '../lib/selfhost/sqlite.ts';
import {acquireSourceLease,apiGuard} from '../lib/grid/security.ts';
test('SQLite migrations, durable records, atomic leases and batch rollback',async()=>{
 const temp=mkdtempSync(join(tmpdir(),'grid-')),file=join(temp,'db.sqlite');let db;
 try{
  db=new SqliteArchive(file,resolve('drizzle'));
  const values=['test','test','test','2026-09-17','hash','{}','2026-09-19T00:00:00Z'];
  await db.batch([db.prepare('INSERT INTO source_artifacts VALUES (?,?,?,?,?,?,?)').bind(...values),db.prepare('INSERT INTO source_cache VALUES (?,?,?)').bind('test','test',100)]);
  assert.equal((await db.prepare('SELECT * FROM source_artifacts').all()).results.length,1);
  await assert.rejects(db.batch([db.prepare('DELETE FROM source_artifacts'),db.prepare('INSERT INTO missing VALUES (1)')]));
  assert.equal((await db.prepare('SELECT * FROM source_artifacts').all()).results.length,1);
  const leases=await Promise.all(Array.from({length:10},()=>acquireSourceLease(db,'energy',15000,1000)));
  assert.equal(leases.filter(Boolean).length,1);
  db.close();db=new SqliteArchive(file,resolve('drizzle'));
  assert.equal((await db.prepare('SELECT * FROM source_artifacts').first()).id,'test');
  assert.equal(await acquireSourceLease(db,'energy',15000,16000),true);
 }finally{db?.close();rmSync(temp,{recursive:true,force:true});}
});
test('Self-hosted origin validation does not rely on spoofable identity headers',()=>{
 const old=process.env.GRID_SELF_HOSTED,origin=process.env.APP_ORIGIN;
 try{
  process.env.GRID_SELF_HOSTED='1';process.env.APP_ORIGIN='https://grid.humza.xyz';
  assert.equal(apiGuard(new Request('http://localhost:6000/api/grid',{headers:{origin:'https://grid.humza.xyz'}})),null);
  assert.equal(apiGuard(new Request('http://localhost:6000/api/grid',{headers:{origin:'https://evil.example','oai-authenticated-user-email':'forged'}})).status,403);
  delete process.env.APP_ORIGIN;
  assert.equal(apiGuard(new Request('http://localhost:6000/api/grid')).status,503);
 }finally{if(old===undefined)delete process.env.GRID_SELF_HOSTED;else process.env.GRID_SELF_HOSTED=old;if(origin===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=origin;}
});
