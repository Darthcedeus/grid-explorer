// Run after build:docker. Exercises the shipped Node server over HTTP port 6000.
import {spawn} from 'node:child_process';
import {request} from 'node:http';
import {mkdtempSync,cpSync,mkdirSync,rmSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const root=resolve('dist/standalone'),temp=mkdtempSync(join(tmpdir(),'grid-smoke-'));
cpSync('drizzle',join(root,'drizzle'),{recursive:true});mkdirSync(join(root,'deploy'),{recursive:true});
for(const name of ['start.mjs','check-feeds.mjs'])cpSync('deploy/'+name,join(root,'deploy',name));
const app=spawn(process.execPath,['deploy/start.mjs'],{cwd:root,env:{...process.env,GRID_SELF_HOSTED:'1',APP_ORIGIN:'https://grid.humza.xyz',GRID_DB_PATH:join(temp,'grid.sqlite'),PORT:'6000',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
let logs='';app.stdout.on('data',d=>logs+=d);app.stderr.on('data',d=>logs+=d);
function get(path,headers={}){return new Promise((resolve,reject)=>{request({hostname:'127.0.0.1',port:6000,path,headers,signal:AbortSignal.timeout(10000)},r=>{let body='';r.on('data',d=>body+=d);r.on('error',reject);r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,body}));}).on('error',reject).end();});}
try{
 let ready=false;for(let n=0;n<80;n++){try{if((await get('/api/health')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,logs);
 const health=await get('/api/health');assert.equal(JSON.parse(health.body).runtime,'node-sqlite');assert.equal(health.headers['cache-control'],'no-store');
 const page=await get('/');assert.equal(page.status,200);assert.match(page.body,/Netherlands Grid Explorer/);assert.match(page.headers['content-security-policy'],/object-src 'none'/);
 assert.equal((await get('/api/sources',{origin:'https://grid.humza.xyz'})).status,200);
 assert.equal((await get('/api/sources',{origin:'https://evil.example'})).status,403);
 assert.equal((await get('/api/grid?date=bad')).status,400);
 const assets=await get('/api/assets');assert.equal(assets.status,200);assert.ok(JSON.parse(assets.body).assets.length);
 for(const path of ['/data/producers.geojson','/data/stations.geojson','/data/network.geojson','/data/enexis/capacity.json'])assert.equal((await get(path)).status,200,path);
 const worker=readdirSync(join(root,'dist/client/_next/static')).find(n=>/^maplibre-gl-worker-.*\.js$/.test(n));assert.ok(worker);assert.equal((await get('/_next/static/'+worker)).status,200);
 const probe=spawn(process.execPath,['deploy/check-feeds.mjs','--health'],{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});
 const code=await new Promise(r=>probe.on('exit',r));assert.equal(code,0,'Docker health command must work on port 6000');
 console.log('PASS: production HTTP, health command, SQLite, origin guard, initial HTML, CSP, map worker and primary data assets.');
}finally{app.kill('SIGTERM');await new Promise(r=>app.once('exit',r));rmSync(temp,{recursive:true,force:true});}
