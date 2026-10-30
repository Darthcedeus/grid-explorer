import {entsoeWindow} from './entsoe.ts';
import type {Dataset,Interval} from './types';
import type {EntsoeResult} from './entsoe-contract';
const names:Record<string,string>={B01:'biomass',B04:'fossil_gas',B05:'fossil_hard_coal',B14:'nuclear',B16:'solar',B17:'waste',B18:'wind_offshore',B19:'wind_onshore'};
const borders=['belgium','denmark','germany','norway','united_kingdom'];
/** Exact interval joins only: never interpolate, carry forward or substitute dates. */
export function entsoeReplay(generation:EntsoeResult,load:EntsoeResult,flows:Dataset,now=Date.now()):Dataset{
 if(generation.product!=='generation'||load.product!=='load'||generation.day!==load.day)throw Error('Mismatched replay products or dates');
 const series=generation.series.filter(s=>s.direction==='generation');
 if(!series.length||load.series.length!==1)throw Error('Generation or unambiguous national load is unavailable');
 const psrs=new Set<string>();for(const s of series){if(!s.psrType||psrs.has(s.psrType)||s.unit!=='MW')throw Error('Ambiguous generation series');psrs.add(s.psrType);}
 if(load.series[0].unit!=='MW')throw Error('Unexpected load unit');
 const key=(p:{start:string;end:string})=>p.start+'/'+p.end;
 const indexes=series.map(s=>new Map(s.points.map(p=>[key(p),p.value])));
 const flowIndex=new Map(flows.intervals.map(i=>[key(i),i]));
 const window=entsoeWindow(load.day),from=Date.parse(window.start),until=Math.min(Date.parse(window.end),now);
 const loadIndex=new Map(load.series[0].points.map(p=>[key(p),p.value]));
 for(const s of [...series,...load.series])for(const p of s.points)if(Date.parse(p.end)-Date.parse(p.start)!==900000)throw Error('Replay requires published 15-minute intervals');
 const slots=Array.from({length:Math.max(0,Math.floor((until-from)/900000))},(_,i)=>({start:new Date(from+i*900000).toISOString(),end:new Date(from+(i+1)*900000).toISOString()}));
 const intervals:Interval[]=slots.map(slot=>{const p={...slot,value:loadIndex.get(key(slot))??null};
  if(Date.parse(p.end)-Date.parse(p.start)!==900000)throw Error('Replay requires published 15-minute intervals');
  const mix:Record<string,number|null>={};
  series.forEach((s,n)=>{const category=names[s.psrType!]||'others',v=indexes[n].get(key(p))??null;mix[category]=v===null||mix[category]===null?null:(mix[category]??0)+v;});
  const values=Object.values(mix),total=values.every(v=>v!==null)?values.reduce<number>((n,v)=>n+v!,0):null;
  const f=flowIndex.get(key(p)),borderValues=Object.fromEntries(borders.map(b=>[b,f?.borders[b]??null]));
  const net=Object.values(borderValues).every(v=>v!==null)?Object.values(borderValues).reduce<number>((n,v)=>n+v!,0):null;
  const missing=[...Object.entries(mix),...Object.entries(borderValues)].filter(([,v])=>v===null).map(([k])=>k);if(p.value===null)missing.push('load');
  return {start:p.start,end:p.end,generation:total,load:p.value,mix,borders:borderValues,netImports:net,residual:total!==null&&p.value!==null&&net!==null?total+net-p.value:null,missing};
 });
 if(!intervals.some(i=>i.generation!==null&&i.load!==null))throw Error('No elapsed common ENTSO-E generation and load observations');
 const warnings=['Generation and load: ENTSO-E direct. Physical borders: Energy-Charts, joined only on identical UTC intervals.','Generation is the sum of published generation-side categories. Consumption-side series are excluded; coverage can differ from Energy-Charts public net generation.','National totals do not establish output at individual map markers.'];
 if(intervals.some(i=>i.netImports===null))warnings.push('Some physical-border observations are unavailable for this date; exchange and residual remain missing.');
 const stale=[generation.warning,load.warning,flows.retrieval?.fallbackReason].filter(Boolean).join(' ');
 if(stale)warnings.push(stale);
 return {source:'ENTSO-E direct · borders via Energy-Charts',sourceUrl:generation.sourceUrl,mode:'recorded',delivery:generation.delivery==='cache'&&load.delivery==='cache'?'cache':'upstream',fetchedAt:[generation.fetchedAt,load.fetchedAt].sort()[0],generatedAt:generation.createdAt,intervalMinutes:15,intervals,powerLatest:intervals.filter(i=>i.generation!==null&&i.load!==null).at(-1)!.end,flowsLatest:intervals.filter(i=>i.netImports!==null).at(-1)?.end||'',warnings,retrieval:{requestedDay:generation.day,checkedAt:new Date(now).toISOString(),fallbackReason:stale||null,powerFetchedAt:generation.fetchedAt,flowsFetchedAt:flows.fetchedAt},provenance:{powerUrl:generation.sourceUrl,flowsUrl:flows.provenance.flowsUrl,license:'ENTSO-E dataset reuse terms; Energy-Charts border attribution retained',method:'Direct ENTSO-E published generation-side categories and total load; Energy-Charts physical borders. Exact 15-minute interval joins; no geographic allocation.',transformVersion:'entsoe-replay/1.0'},directProvenance:{generation:{documentId:generation.documentId,revision:generation.revision,fetchedAt:generation.fetchedAt},load:{documentId:load.documentId,revision:load.revision,fetchedAt:load.fetchedAt}}};
}
