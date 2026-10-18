import {env} from 'cloudflare:workers';
import {apiGuard} from '@/lib/grid/security';
export async function GET(request:Request){
 if(process.env.GRID_SELF_HOSTED!=='1'){const denied=apiGuard(request);if(denied)return denied;}
 try{
  await env.DB!.prepare('SELECT 1 AS ready').first();
  return Response.json({status:'ok',runtime:process.env.GRID_SELF_HOSTED==='1'?'node-sqlite':'sites',release:'docker-2026-09-19-1',checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({status:'unavailable',error:'Observation archive unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
