import {apiGuard} from '@/lib/grid/security';
import {SOURCES} from '@/lib/grid/sources';
export async function GET(request:Request){
 const denied=apiGuard(request);if(denied)return denied;
return Response.json({reviewDate:'2026-09-18',sources:SOURCES});}
