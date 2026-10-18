import http from 'node:http';
import https from 'node:https';
// Runs inside the app container; does not print secrets or provider bodies.
const base=process.env.GRID_CHECK_URL||'http://127.0.0.1:6000';
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const paths=process.argv.includes('--health')?['/api/health']:['/api/health','/api/grid','/api/rwe','/api/tennet',`/api/ned?point=28&date=${day}`];
let failures=0;
for(const path of paths){
 try{
  const {status,body}=await getJson(base+path);
  const response={ok:status>=200&&status<300,status};
  const warning=body.error||body.message||body.warning||body.retrieval?.fallbackReason||body.plants?.warning||null;
  const recordCount=body.intervals?.length??body.records?.length??body.plants?.data?.length??null;
  const delivery=body.delivery||body.plants?.delivery||null;
  const ok=response.ok&&!warning&&body.status!=='no_data'&&recordCount!==0;
  if(!ok)failures++;
  console.log(JSON.stringify({path,httpStatus:response.status,ok,status:body.status??null,delivery,recordCount,checkedAt:body.retrieval?.checkedAt||body.checkedAt||new Date().toISOString(),fetchedAt:body.retrieval?.powerFetchedAt||body.fetchedAt||body.plants?.fetchedAt||null,warning}));
 }catch(error){failures++;console.log(JSON.stringify({path,ok:false,error:error.message}));}
}
process.exitCode=failures?1:0;

// Fetch and browsers block port 6000 as an X11 port. Node's HTTP client is
// appropriate for internal probes; people use HTTPS through Caddy instead.
function getJson(url){return new Promise((resolve,reject)=>{
 const target=new URL(url),client=target.protocol==='https:'?https:http;
 const req=client.get(target,{signal:AbortSignal.timeout(65000)},res=>{
  const chunks=[];let size=0;
  res.on('data',chunk=>{size+=chunk.length;if(size>4_000_000)res.destroy(new Error('Response too large'));else chunks.push(chunk);});
  res.on('error',reject);
  res.on('end',()=>{try{resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks).toString())});}catch(error){reject(error);}});
 });req.on('error',reject);
});}
