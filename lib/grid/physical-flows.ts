import type {Envelope,Interval} from './types';
export type PhysicalFlows={intervals:Pick<Interval,'start'|'end'|'borders'>[];fetchedAt:string;sourceUrl:string;warning:string|null};
const borders=['belgium','denmark','germany','norway','united_kingdom'];
export function normalizePhysicalFlows(data:Envelope):PhysicalFlows['intervals']{
 if(data.schema_version!=='2.0'||data.endpoint!=='cbpf'||data.country!=='nl'||data.unit!=='GW'||data.interval_minutes!==15||data.attributes.sign_convention!=='positive = import, negative = export'||!Array.isArray(data.data))throw Error('Unexpected physical-border contract');
 const seen=new Set<number>();
 return data.data.map(row=>{
  const t=Date.parse(row.timestamp);if(!Number.isFinite(t)||seen.has(t))throw Error('Invalid or duplicate physical-border timestamp');seen.add(t);
  return {start:new Date(t).toISOString(),end:new Date(t+900000).toISOString(),borders:Object.fromEntries(borders.map(id=>{const v=row.values[id];if(v!==null&&v!==undefined&&(typeof v!=='number'||!Number.isFinite(v)))throw Error('Invalid border value');return [id,v==null?null:v*1000];}))};
 }).sort((a,b)=>a.start.localeCompare(b.start));
}
