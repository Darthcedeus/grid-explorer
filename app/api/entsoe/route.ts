import {entsoeResponse} from '@/lib/grid/entsoe-server';
export async function GET(request:Request){return entsoeResponse(request);}
