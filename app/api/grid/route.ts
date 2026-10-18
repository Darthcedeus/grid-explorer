import {apiGuard} from '@/lib/grid/security';
import {loadDataset} from '@/lib/grid/server';
import {dutchDay,validObservationDay} from '@/lib/grid/freshness';
export async function GET(request:Request){
 const denied=apiGuard(request);if(denied)return denied;

 const requested=new URL(request.url).searchParams.get('date');const date=requested||dutchDay();
 if(!validObservationDay(date))return Response.json({error:'Choose a valid date on or before today in Amsterdam.'},{status:400});
 return Response.json(await loadDataset(date,!requested),{headers:{'Cache-Control':'no-store'}});
}
