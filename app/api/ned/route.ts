import {apiGuard,fetchWithoutRedirects,boundedText,acquireSourceLease} from '@/lib/grid/security';
import {env} from 'cloudflare:workers';
import {normalizeNed} from '@/lib/grid/domain';
import {dutchDay,validObservationDay} from '@/lib/grid/freshness';
import {nedPage,NED_OFFSHORE_POINTS} from '@/lib/grid/ned';
export async function GET(request:Request){
 const denied=apiGuard(request);if(denied)return denied;

 const key=(env as unknown as Record<string,string|undefined>).NED_API_KEY;
 if(!key)return Response.json({status:'not_configured',message:'NED API key is not configured.'},{status:503});
 const params=new URL(request.url).searchParams,point=Number(params.get('point')||28),date=params.get('date')||dutchDay();
 if(!NED_OFFSHORE_POINTS.includes(point)||!validObservationDay(date))return Response.json({error:'Choose a supported offshore farm and valid date.'},{status:400});
 const next=new Date(Date.parse(date)+86400000).toISOString().slice(0,10);
 const query=new URLSearchParams({point:String(point),type:'17',granularity:'4',granularitytimezone:'0',classification:'2',activity:'1','validfrom[after]':date,'validfrom[strictly_before]':next});
 let url:string|null=`https://api.ned.nl/v1/utilizations?${query}`;const visited=new Set<string>();const records:ReturnType<typeof normalizeNed>[]=[];
 try{
  if(!env.DB)return Response.json({error:'NED request limiter is unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});
  if(!await acquireSourceLease(env.DB,'ned',120000))return Response.json({error:'NED refresh is temporarily limited. Retry in two minutes.'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':'120'}});
  const deadline=AbortSignal.timeout(25000);
  while(url){if(visited.has(url)||visited.size>=10)throw Error('Pagination limit');visited.add(url);
   const r=await fetchWithoutRedirects(url,{headers:{'X-AUTH-TOKEN':key,Accept:'application/ld+json'},signal:deadline});
   if(!r.ok){let upstreamCode:number|null=null;try{const errorBody=JSON.parse(await boundedText(r,65536)) as {error_code?:unknown};if(errorBody.error_code===1010)upstreamCode=1010;}catch{}
    return Response.json({status:'upstream_error',upstreamStatus:r.status,upstreamCode,error:upstreamCode===1010?'NED’s Cloudflare firewall denied this application request (error 1010). Key validity could not be established. Contact NED support with the connection report.':`NED returned HTTP ${r.status}. ${r.status===401||r.status===403?'Access was denied. Credentials, account permissions or provider network restrictions may be responsible.':'Please retry later.'}`},{status:502,headers:{'Cache-Control':'no-store'}});
   }
   const page=nedPage(JSON.parse(await boundedText(r,1000000)));for(const row of page.rows){const record=normalizeNed(row as Parameters<typeof normalizeNed>[0],'modelled');if(record.start.slice(0,10)!==date)throw Error('Unexpected record date');records.push(record);}url=page.next;
  }
  // Keep the newest revision for each exact interval. No filling or allocation.
  const unique=new Map<string,ReturnType<typeof normalizeNed>>();for(const r of records){const old=unique.get(r.start);if(!old||Date.parse(r.revisionAt)>Date.parse(old.revisionAt))unique.set(r.start,r);}
  return Response.json({status:records.length?'connected':'no_data',point,date,method:'modelled',scope:'offshore farm',fetchedAt:new Date().toISOString(),records:[...unique.values()].sort((a,b)=>a.start.localeCompare(b.start)),note:'NED offshore farm estimates. Power in MW and interval energy in MWh are separate; these are not direct plant telemetry.'},{headers:{'Cache-Control':'private, max-age=900'}});
 }catch{return Response.json({status:'unavailable',error:'NED request or response validation failed. No values have been substituted.'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
