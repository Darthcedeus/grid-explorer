import {env} from 'cloudflare:workers';
import {apiGuard,fetchWithoutRedirects,boundedText,acquireSourceLease} from '@/lib/grid/security';
import {ENTSOE_URL,ENTSOE_PRODUCTS,type EntsoeProduct,type EntsoeResult} from '@/lib/grid/entsoe-contract';
import {entsoeQuery,entsoeWindow,normalizeEntsoe} from '@/lib/grid/entsoe';
import {dutchDay} from '@/lib/grid/freshness';
export async function GET(request:Request){
 const denied=apiGuard(request);if(denied)return denied;
 const url=new URL(request.url),product=url.searchParams.get('product')||'load',day=url.searchParams.get('date')||dutchDay();
 const fail=(error:string,status:number)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
 if(!Object.hasOwn(ENTSOE_PRODUCTS,product))return fail('Unknown ENTSO-E product.',400);
 try{entsoeWindow(day);const tomorrow=new Date(Date.parse(dutchDay())+86400000).toISOString().slice(0,10);if(day<'2015-01-01'||day>tomorrow)throw Error();}catch{return fail('Choose a valid date from 2015 through tomorrow.',400);}
 const key=(env as unknown as Record<string,string|undefined>).ENTSOE_API_KEY;
 if(!key)return fail('ENTSO-E key is not configured.',503);
 const db=env.DB;if(!db)return fail('ENTSO-E archive unavailable.',503);
 const selected=product as EntsoeProduct,cacheKey=`entsoe:v1:${product}:${day}`,now=Date.now();let cached:{body:string;fetched_at:string;expires_at:number}|null=null;
 const respond=(body:string,fetchedAt:string,delivery:'cache'|'upstream',warning:string|null=null)=>{
  const data=normalizeEntsoe(body,selected,day);const result:EntsoeResult={...data,product:selected,day,status:data.series.some(s=>s.points.some(p=>p.value!==null))?'connected':'no_data',fetchedAt,delivery,warning,sourceUrl:ENTSOE_URL};
  return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});
 };
 try{
  cached=await db.prepare('SELECT a.body,a.fetched_at,c.expires_at FROM source_cache c JOIN source_artifacts a ON a.id=c.artifact_id WHERE c.key=?').bind(cacheKey).first();
  if(cached&&cached.expires_at>now)return respond(cached.body,cached.fetched_at,'cache');
  if(!await acquireSourceLease(db,'entsoe',2000)){
   if(cached)return respond(cached.body,cached.fetched_at,'cache','Refresh temporarily limited; showing an older archived response.');
   return Response.json({error:'ENTSO-E refresh temporarily limited. Retry shortly.'},{status:503,headers:{'Retry-After':'2','Cache-Control':'no-store'}});
  }
  const params=entsoeQuery(selected,day);params.set('securityToken',key);
  const response=await fetchWithoutRedirects(`${ENTSOE_URL}?${params}`,{headers:{Accept:'application/xml'},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error(`ENTSO-E returned HTTP ${response.status}.`);
  const body=await boundedText(response);normalizeEntsoe(body,selected,day);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body)))).map(v=>v.toString(16).padStart(2,'0')).join('');
  const id=`${cacheKey}:${hash}`,fetchedAt=new Date().toISOString();
  await db.batch([db.prepare('INSERT OR IGNORE INTO source_artifacts (id,source,endpoint,day,sha256,body,fetched_at) VALUES (?,?,?,?,?,?,?)').bind(id,'entsoe',product,day,hash,body,fetchedAt),db.prepare('INSERT INTO source_cache (key,artifact_id,expires_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET artifact_id=excluded.artifact_id,expires_at=excluded.expires_at').bind(cacheKey,id,now+900000)]);
  return respond(body,fetchedAt,'upstream');
 }catch(e){
  // Never expose fetch exception messages: they can contain the credentialed URL.
  const message=e instanceof Error&&/^ENTSO-E returned HTTP \d+\.$/.test(e.message)?e.message:'ENTSO-E retrieval or validation failed.';
  if(cached){try{return respond(cached.body,cached.fetched_at,'cache',message+' Showing older archived data.');}catch{}}
  return fail(message+' No substitute values are shown.',502);
 }
}
