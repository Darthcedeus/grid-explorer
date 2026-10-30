import {fetchWithoutRedirects,boundedText,acquireSourceLease} from './security';
import { env } from 'cloudflare:workers';
import { normalizePair } from './domain';
import {normalizePhysicalFlows,type PhysicalFlows} from './physical-flows';
import { bundled } from './bundled';
import type { Envelope, Dataset } from './types';
const BASE='https://api.energy-charts.info/v2/';
import {dutchDay,resolveDataset} from './freshness';
async function getEnvelope(endpoint:'public_power'|'cbpf',day:string,mayRefresh:()=>Promise<boolean>):Promise<{data:Envelope;cached:boolean;fetchedAt:string;warning?:string}>{
 const db=env.DB;if(!db)throw Error('Observation archive unavailable');const key=`energy:${endpoint}:${day}`;const now=Date.now();
 const row=await db.prepare('SELECT a.body, a.fetched_at, c.expires_at FROM source_cache c JOIN source_artifacts a ON a.id = c.artifact_id WHERE c.key = ?').bind(key).first<{body:string;fetched_at:string;expires_at:number}>();
 if(row&&row.expires_at>now)return {data:JSON.parse(row.body),cached:true,fetchedAt:row.fetched_at};
 try{
 if(!await mayRefresh())throw Error('Provider refresh temporarily limited; retry shortly.');
 const response=await fetchWithoutRedirects(`${BASE}${endpoint}?country=nl&start=${day}`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(18000)});
 if(!response.ok){const retry=response.headers.get('Retry-After');throw Error(`Energy-Charts ${endpoint}: HTTP ${response.status}${retry?`; retry after ${retry}s`:''}`);}
 const text=await boundedText(response);const data=JSON.parse(text) as Envelope;
 if(data.schema_version!=='2.0'||!Array.isArray(data.data)||!data.data.length)throw Error('Source returned no usable data');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const id=`${endpoint}:${day}:${hash}`,fetchedAt=new Date().toISOString();
 await db.batch([
  db.prepare('INSERT OR IGNORE INTO source_artifacts (id,source,endpoint,day,sha256,body,fetched_at) VALUES (?,?,?,?,?,?,?)').bind(id,'energy-charts',endpoint,day,hash,text,fetchedAt),
  db.prepare('INSERT INTO source_cache (key,artifact_id,expires_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET artifact_id=excluded.artifact_id,expires_at=excluded.expires_at').bind(key,id,now+900000)
 ]);
 return {data,cached:false,fetchedAt};
 }catch(e){if(row)return {data:JSON.parse(row.body),cached:true,fetchedAt:row.fetched_at,warning:`${endpoint} refresh failed; using an older archived response (${row.fetched_at}). ${e instanceof Error?e.message:'source error'}`};throw e;}
}
async function retrieveDay(day:string,mayRefresh:()=>Promise<boolean>):Promise<Dataset>{
 const [power,flows]=await Promise.all([getEnvelope('public_power',day,mayRefresh),getEnvelope('cbpf',day,mayRefresh)]);
 const result=normalizePair(power.data,flows.data,power.fetchedAt,power.cached&&flows.cached?'cache':'upstream');
 // Ignore future slots; null observations in elapsed slots stay explicitly missing.
 result.intervals=result.intervals.filter(i=>Date.parse(i.end)<=Date.now()&&dutchDay(new Date(i.start))===day);
 if(!result.intervals.length)throw Error('No elapsed common intervals for the requested day');
 return {...result,retrieval:{requestedDay:day,checkedAt:new Date().toISOString(),fallbackReason:[power.warning,flows.warning].filter(Boolean).join(' ')||null,powerFetchedAt:power.fetchedAt,flowsFetchedAt:flows.fetchedAt}};
}
export async function loadDataset(day=dutchDay(),latest=false):Promise<Dataset>{
 let permission:Promise<boolean>|undefined;
 const mayRefresh=()=>permission??=(env.DB?acquireSourceLease(env.DB,'energy',15000).catch(()=>false):Promise.resolve(false));
 return resolveDataset(day,latest,d=>retrieveDay(d,mayRefresh),bundled);
}

/** Border retrieval must not depend on Energy-Charts generation availability. */
export async function loadPhysicalFlows(day:string):Promise<PhysicalFlows>{
 const sourceUrl=`${BASE}cbpf?country=nl&start=${day}`;
 try{
  const response=await getEnvelope('cbpf',day,()=>env.DB?acquireSourceLease(env.DB,'energy',15000):Promise.resolve(false));
  const intervals=normalizePhysicalFlows(response.data).filter(i=>Date.parse(i.end)<=Date.now()&&dutchDay(new Date(i.start))===day);
  return {intervals,fetchedAt:response.fetchedAt,sourceUrl,warning:response.warning||null};
 }catch{return {intervals:[],fetchedAt:'',sourceUrl,warning:'Physical-border observations could not be retrieved for this date. No other date is substituted.'};}
}
