import {env} from 'cloudflare:workers';
import {acquireSourceLease} from '@/lib/grid/security';
import {entsoeResponse} from '@/lib/grid/entsoe-server';
import {entsoeReplay} from '@/lib/grid/entsoe-replay';
import type {EntsoeResult} from '@/lib/grid/entsoe-contract';
import {apiGuard} from '@/lib/grid/security';
import {loadDataset} from '@/lib/grid/server';
import {dutchDay,validObservationDay} from '@/lib/grid/freshness';
export async function GET(request:Request){
 const denied=apiGuard(request);if(denied)return denied;

 const requested=new URL(request.url).searchParams.get('date');const date=requested||dutchDay();
 if(!validObservationDay(date))return Response.json({error:'Choose a valid date on or before today in Amsterdam.'},{status:400});
 const source=new URL(request.url).searchParams.get('source')||'energy';
 if(!['energy','entsoe'].includes(source))return Response.json({error:'Unknown replay source'},{status:400});
 if(source==='entsoe'){
  let lease:Promise<boolean>|undefined;const mayRefresh=()=>lease??=(env.DB?acquireSourceLease(env.DB,'entsoe',2000):Promise.resolve(false));
  const get=async(product:string)=>{const url=new URL(request.url);url.pathname='/api/entsoe';url.search=new URLSearchParams({product,date}).toString();const response=await entsoeResponse(new Request(url,{headers:request.headers}),mayRefresh);const body=await response.json() as EntsoeResult&{error?:string};if(!response.ok)throw Error(body.error||'ENTSO-E unavailable');return body as EntsoeResult;};
  try{const [generation,load,flows]=await Promise.all([get('generation'),get('load'),loadDataset(date,false)]);return Response.json(entsoeReplay(generation,load,flows),{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:e instanceof Error?e.message:'ENTSO-E replay unavailable'},{status:502,headers:{'Cache-Control':'no-store'}});}
 }
 return Response.json(await loadDataset(date,!requested),{headers:{'Cache-Control':'no-store'}});
}
