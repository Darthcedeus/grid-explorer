import {apiGuard,fetchWithoutRedirects,boundedText} from '@/lib/grid/security';
import {env} from 'cloudflare:workers';
import {RWE_BASE,rwePlants,rweHistory,rweLive,type RweEnvelope} from '@/lib/grid/rwe';
async function retrieve<T>(path:string,validate:(v:unknown)=>T,ttl:number):Promise<RweEnvelope<T>>{
 const db=env.DB;if(!db)throw Error('RWE cache unavailable');const key='rwe:'+path,now=Date.now();
 const cached=await db.prepare('SELECT a.body,a.fetched_at,c.expires_at FROM source_cache c JOIN source_artifacts a ON a.id=c.artifact_id WHERE c.key=?').bind(key).first<{body:string;fetched_at:string;expires_at:number}>();
 const respond=(body:string,fetchedAt:string,delivery:'upstream'|'cache',warning:string|null=null)=>({data:validate(JSON.parse(body)),fetchedAt,delivery,warning,sourceUrl:RWE_BASE+path});
 if(cached&&cached.expires_at>now)return respond(cached.body,cached.fetched_at,'cache');
 try{
 const lease=await db.prepare('INSERT INTO source_cache (key,artifact_id,expires_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET expires_at=excluded.expires_at WHERE source_cache.expires_at<=? RETURNING key').bind(key+':lease','reserved',now+60000,now).first();
 if(!lease)throw Error('RWE refresh pending; retry in one minute.');
 const r=await fetchWithoutRedirects(RWE_BASE+path,{headers:{'User-Agent':'NetherlandsGridExplorer/1.0 (educational data integration research)',Accept:'application/json'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error(`RWE returned HTTP ${r.status}.`);const body=await boundedText(r);validate(JSON.parse(body));
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body)))).map(x=>x.toString(16).padStart(2,'0')).join(''),id=key+':'+hash,fetchedAt=new Date().toISOString();
 await db.batch([db.prepare('INSERT OR IGNORE INTO source_artifacts (id,source,endpoint,day,sha256,body,fetched_at) VALUES (?,?,?,?,?,?,?)').bind(id,'rwe',path,fetchedAt.slice(0,10),hash,body,fetchedAt),db.prepare('INSERT INTO source_cache (key,artifact_id,expires_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET artifact_id=excluded.artifact_id,expires_at=excluded.expires_at').bind(key,id,now+ttl)]);
 return respond(body,fetchedAt,'upstream');
 }catch(e){if(cached)return respond(cached.body,cached.fetched_at,'cache','Refresh failed or is pending. Showing an older archived response.');throw e;}
}
export async function GET(request:Request){
 const denied=apiGuard(request);if(denied)return denied;
try{
 const id=new URL(request.url).searchParams.get('plant');
 if(id&&!/^[A-Za-z0-9_-]{1,64}$/.test(id))return Response.json({error:'Invalid plant identifier'},{status:400});
 const plants=await retrieve('master/',rwePlants,86400000);
 if(!id)return Response.json({plants});
 const plant=plants.data.find(p=>p.id===id);if(!plant)return Response.json({error:'Unknown Dutch RWE plant'},{status:404});
 const query=new URLSearchParams({powerType:plant.types.length===1?plant.types[0]:'all',country:'NL',location:plant.id});
 const [history,live]=await Promise.all([retrieve('history/?'+query,v=>rweHistory(v,id),900000),retrieve('live/',rweLive,900000)]);
 return Response.json({plants,plantId:id,history,live},{headers:{'Cache-Control':'private, max-age=60'}});
 }catch(e){return Response.json({error:e instanceof Error&&/^RWE (returned|refresh)/.test(e.message)?e.message:'RWE retrieval or validation failed. No substitute readings are shown.'},{status:502,headers:{'Cache-Control':'no-store'}});}}
