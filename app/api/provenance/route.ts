import {apiGuard} from '@/lib/grid/security';
import {env} from 'cloudflare:workers';
export async function GET(request:Request){
 const denied=apiGuard(request);if(denied)return denied;
const day=new URL(request.url).searchParams.get('date')||'2026-09-17';if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return Response.json({error:'Invalid date'},{status:400});try{if(!env.DB)throw Error('No archive');const data=await env.DB.prepare('SELECT id,source,endpoint,day,sha256,fetched_at FROM source_artifacts WHERE day=? ORDER BY fetched_at DESC LIMIT 20').bind(day).all();return Response.json({artifacts:data.results});}catch{return Response.json({artifacts:[],note:'Archive unavailable; bundled artifact hashes are documented in the research dossier.'},{status:503});}}
