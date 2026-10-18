import type {Dataset} from './types';
export function dutchDay(now=new Date()):string {
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function validObservationDay(day:string,today=dutchDay()):boolean {
 return /^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day&&day<=today;
}
export function previousDay(day:string):string {return new Date(Date.parse(day)-86400000).toISOString().slice(0,10);}
export function latestIntervalIndex(dataset:Dataset,now=Date.now()):number {
 for(let i=dataset.intervals.length-1;i>=0;i--)if(Date.parse(dataset.intervals[i].end)<=now&&dataset.intervals[i].missing.length===0)return i;
 for(let i=dataset.intervals.length-1;i>=0;i--)if(Date.parse(dataset.intervals[i].end)<=now)return i;
 return 0;
}
export function ageLabel(timestamp:string,now=Date.now()):string {
 const mins=Math.max(0,Math.floor((now-Date.parse(timestamp))/60000));
 return mins<60?`${mins} min ago`:mins<1440?`${Math.floor(mins/60)} h ago`:`${Math.floor(mins/1440)} days ago`;
}

export async function resolveDataset(day:string,latest:boolean,retrieve:(day:string)=>Promise<Dataset>,fallback:()=>Dataset):Promise<Dataset>{
 const failures:string[]=[];
 for(const candidate of latest?[day,previousDay(day)]:[day]){
  try{const result=await retrieve(candidate);if(!result.intervals.length)throw Error('No common intervals');return {...result,retrieval:{...result.retrieval,requestedDay:day,checkedAt:new Date().toISOString(),fallbackReason:[failures.length?`Today's feed is unavailable. Showing ${candidate}. ${failures.join(' ')}`:null,result.retrieval?.fallbackReason].filter(Boolean).join(' ')||null}};}
  catch(e){failures.push(`${candidate}: ${e instanceof Error?e.message:'source error'}`);}
 }
 const saved=fallback();const reason=`Requested ${day} unavailable. Showing the saved ${dutchDay(new Date(saved.intervals[0].start))} snapshot. ${failures.join(' ')}`;
 return {...saved,retrieval:{requestedDay:day,checkedAt:new Date().toISOString(),fallbackReason:reason},warnings:[reason,...saved.warnings]};
}
