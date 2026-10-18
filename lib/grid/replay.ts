import type {Interval} from './types';

export const BORDER_ENDS:Record<string,[number,number]>={belgium:[4.2,50.75],germany:[7.25,52.1],denmark:[7.15,54.12],norway:[5.5,54.35],united_kingdom:[2.05,52.15]};
const CENTRE:[number,number]=[5.25,52.35];
export function borderFlow(id:string,value:number|null|undefined){
 const end=BORDER_ENDS[id];
 if(!end||typeof value!=='number'||!Number.isFinite(value))return null;
 const coordinates=value>0?[end,CENTRE]:[CENTRE,end];
 return {id,value,coordinates,color:value===0?'#8b9bab':value>0?'#009d91':'#c386d6',width:value===0?1:Math.min(10,1+Math.abs(value)/500),moving:value!==0};
}
export function replayScale(intervals:Interval[]){
 // One scale for the entire loaded day; never rescale bars at each frame.
 let peak=1000;
 for(const i of intervals)for(const v of [i.generation,i.load,i.netImports])if(v!==null&&Number.isFinite(v))peak=Math.max(peak,Math.abs(v));
 return Math.ceil(peak/1000)*1000;
}
export function intervalDelta(current:Interval,previous:Interval|undefined,key:'generation'|'load'|'netImports'){
 // Do not imply a one-step change across a missing interval or day boundary.
 if(!previous||previous.end!==current.start||current[key]===null||previous[key]===null)return null;
 return current[key]!-previous[key]!;
}
