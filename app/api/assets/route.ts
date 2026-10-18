import {apiGuard} from '@/lib/grid/security';
import assets from '@/data/assets.json';
export async function GET(request:Request){
 const denied=apiGuard(request);if(denied)return denied;
const q=new URL(request.url).searchParams.get('q')?.toLowerCase()||'';return Response.json({source:'WRI historical registry and operator additions',asOf:'2026-09-18',assets:assets.filter(a=>a.name.toLowerCase().includes(q))});}
