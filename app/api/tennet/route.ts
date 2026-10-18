import {apiGuard,fetchWithoutRedirects,boundedText} from '@/lib/grid/security';
import {env} from 'cloudflare:workers';
import {normalizeTennet,TENNET_URL,type TennetResult} from '@/lib/grid/tennet';
export async function GET(request:Request){
 const denied=apiGuard(request);if(denied)return denied;

 const key=(env as unknown as Record<string,string|undefined>).TENNET_API_KEY;
 if(!key)return Response.json({error:'TenneT key is not configured.'},{status:503});
 const db=env.DB;if(!db)return Response.json({error:'Balancing cache is unavailable.'},{status:503});
 const now=Date.now();let cached:{body:string;fetched_at:string;expires_at:number}|null=null;
 const respond=(body:string,fetchedAt:string,delivery:TennetResult['delivery'],warning:string|null=null)=>{const records=normalizeTennet(JSON.parse(body));return Response.json({status:records.length?'connected':'no_data',records,fetchedAt,delivery,warning,sourceUrl:TENNET_URL} satisfies TennetResult,{headers:{'Cache-Control':'private, max-age=30'}});};
 try{
  cached=await db.prepare('SELECT a.body,a.fetched_at,c.expires_at FROM source_cache c JOIN source_artifacts a ON a.id=c.artifact_id WHERE c.key=?').bind('tennet:latest').first();
  if(cached&&cached.expires_at>now)return respond(cached.body,cached.fetched_at,'cache');
  // A shared atomic lease permits at most one upstream attempt per minute,
  // including failed attempts and concurrent requests from separate workers.
  const lease=await db.prepare('INSERT INTO source_cache (key,artifact_id,expires_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET expires_at=excluded.expires_at WHERE source_cache.expires_at<=? RETURNING key').bind('tennet:latest:lease','reserved',now+60000,now).first();
  if(!lease){if(cached)return respond(cached.body,cached.fetched_at,'cache','Showing the last archived response; a refresh is pending or temporarily limited.');return Response.json({error:'A TenneT check is already in progress. Retry in one minute.'},{status:503,headers:{'Retry-After':'60','Cache-Control':'no-store'}});}
  const response=await fetchWithoutRedirects(TENNET_URL,{headers:{apikey:key,Accept:'application/json'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(`TenneT returned HTTP ${response.status}.`);
  const body=await boundedText(response);normalizeTennet(JSON.parse(body));
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body)))).map(v=>v.toString(16).padStart(2,'0')).join('');
  const id=`tennet:latest:${hash}`,fetchedAt=new Date().toISOString();
  await db.batch([db.prepare('INSERT OR IGNORE INTO source_artifacts (id,source,endpoint,day,sha256,body,fetched_at) VALUES (?,?,?,?,?,?,?)').bind(id,'tennet','balance-delta-high-res/latest',fetchedAt.slice(0,10),hash,body,fetchedAt),db.prepare('INSERT INTO source_cache (key,artifact_id,expires_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET artifact_id=excluded.artifact_id,expires_at=excluded.expires_at').bind('tennet:latest',id,now+60000)]);
  return respond(body,fetchedAt,'upstream');
 }catch(e){const message=e instanceof Error&&/^TenneT returned HTTP \d+\.$/.test(e.message)?e.message:'TenneT retrieval or validation failed.';if(cached){try{return respond(cached.body,cached.fetched_at,'cache',`${message} Showing older archived observations.`);}catch{}}
  return Response.json({error:message+' No substitute values are shown.'},{status:502,headers:{'Cache-Control':'no-store'}});
 }
}
