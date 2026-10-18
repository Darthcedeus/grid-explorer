export type EnexisKind='gv'|'kv';
export type EnexisDate='2026-01-01'|'2026-07-01';
export type EnexisMetric='solarMw'|'windMw'|'solarConstructionMw'|'windConstructionMw'|'solarMwp'|'connections'|'generatingConnections';
export interface EnexisRecord{id:string;code:string;name:string;municipality:string;province:string;mapped:boolean;values:Partial<Record<EnexisMetric,number|null>>;}
export interface EnexisCapacity{snapshots:Record<EnexisKind,Record<EnexisDate,EnexisRecord[]>>;}
export interface EnexisGeometry{type:'FeatureCollection';features:{type:'Feature';id:string;properties:{code:string};geometry:{type:'MultiPolygon';coordinates:number[][][][]}}[];}
export interface EnexisMap{type:'FeatureCollection';features:{type:'Feature';id:string;properties:{code:string;value:number|null};geometry:{type:'MultiPolygon';coordinates:number[][][][]}}[];}
export const ENEXIS_METRICS:Record<EnexisMetric,{label:string;short:string;unit:string;stops:number[]}>= {
 solarMw:{label:'Operating solar inverter capacity',short:'Solar operating',unit:'MW',stops:[0,1,5,20,100]},
 windMw:{label:'Operating wind capacity',short:'Wind operating',unit:'MW',stops:[0,1,5,20,100]},
 solarConstructionMw:{label:'Solar capacity under construction',short:'Solar construction',unit:'MW',stops:[0,1,5,20,100]},
 windConstructionMw:{label:'Wind capacity under construction',short:'Wind construction',unit:'MW',stops:[0,1,5,20,100]},
 solarMwp:{label:'Registered small-connection solar',short:'Solar peak rating',unit:'MWp',stops:[0,.5,2,5,20]},
 connections:{label:'Active small connections',short:'Connections',unit:'connections',stops:[0,100,500,1500,4000]},
 generatingConnections:{label:'Small connections with registered solar',short:'With solar',unit:'connections',stops:[0,100,500,1500,4000]}
};
export const ENEXIS_COLORS=['#e8f6ed','#b2dfc3','#67b698','#26836f','#125047'];
export const ENEXIS_DATES:EnexisDate[]=['2026-01-01','2026-07-01'];
export const ENEXIS_FIELDS:Record<EnexisKind,EnexisMetric[]>={gv:['solarMw','windMw','solarConstructionMw','windConstructionMw'],kv:['solarMwp','generatingConnections','connections']};
export function enexisNumber(value:number|null|undefined,metric:EnexisMetric){return value==null?'Not published':value.toLocaleString('en',{maximumFractionDigits:ENEXIS_METRICS[metric].unit==='connections'?0:3});}
export function enexisMapData(geometry:EnexisGeometry|null,records:EnexisRecord[],metric:EnexisMetric):EnexisMap{
 const matched=new Map(records.filter(r=>r.mapped).map(r=>[r.code,r]));
 return {type:'FeatureCollection',features:(geometry?.features||[]).flatMap(f=>{const r=matched.get(f.id);return r?[{...f,properties:{code:f.id,value:r.values[metric]??null}}]:[];})};
}
export interface EnexisAnnualArea{code:string;connections:number;rows:number;places:string[];meanSja:number;derivedSjaKwh:number;}
export interface EnexisAnnualRow{id:string;from:string;to:string;street:string;place:string;connections:number;sja:number;sji:number;activePercent:number|null;}
export interface EnexisProfileYear{label:string;values:(number|null)[];minimumMw:number;maximumMw:number;missingHours:number;}
export interface EnexisProfile{years:EnexisProfileYear[];hours:number;method:string;timeBasis:string;sign:string;excludedRows:number;}
export function profilePath(values:(number|null)[],x:(i:number)=>number,y:(v:number)=>number){let path='',connected=false;values.forEach((value,i)=>{if(value===null){connected=false;return;}path+=`${connected?'L':'M'}${x(i).toFixed(2)},${y(value).toFixed(2)} `;connected=true;});return path.trim();}

// Matching codes alone cannot establish an unchanged geographic population.
export function comparableEnexisAreas(a:EnexisRecord|undefined,b:EnexisRecord|undefined):boolean{
 return Boolean(a&&b&&a.code&&a.code===b.code&&a.name===b.name&&a.municipality===b.municipality);
}
