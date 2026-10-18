export interface NetworkProperties {id:string;name:string;kind:'line'|'cable'|'substation';voltageKv:number;voltageLabel:string;operator:string;sourceUrl:string;locationQuality:string;ref:string;}
export interface NetworkFeature {type:'Feature';properties:NetworkProperties;geometry:{type:'Point';coordinates:[number,number]}|{type:'LineString';coordinates:[number,number][]};}
export interface NetworkData {type:'FeatureCollection';features:NetworkFeature[];}
export const VOLTAGE_COLORS:Record<number,string>={380:'#9d3d92',220:'#df8f16',150:'#3286c1',110:'#15978c'};
export function networkMatches(f:NetworkFeature,query:string,voltages:number[]){return voltages.includes(f.properties.voltageKv)&&`${f.properties.name} ${f.properties.operator} ${f.properties.ref} ${f.properties.voltageLabel}`.toLowerCase().includes(query.toLowerCase());}
