export interface MapEnrichment {method:string;assetId?:string;datasetKey?:string;sourceObjectId?:string;distanceMetres:number|null;original:Record<string,string>;fields:Record<string,{value:string;source:string;url:string}>;}
export interface MappedEvidence {nameMissing?:boolean;enrichment?:MapEnrichment;snapshotAt?:string;evidence?:Record<string,string>;}
export interface Producer extends MappedEvidence {id:string;name:string;technology:string;kind:string;capacityMw:number|null;capacityPeakMwp?:number|null;operator:string;sourceUrl:string;locationQuality:string;locationTag:string;}
export interface Station extends MappedEvidence {id:string;name:string;voltage:string;kind:string;operator:string;sourceUrl:string;locationQuality:string;sourceId?:'liander'|'stedin';datasetKey?:string;sourceObjectId?:string;operatorAssetId?:string;}
export interface PointFeature<P> {type:'Feature';properties:P;geometry:{type:'Point';coordinates:[number,number]};}
export interface PointData<P> {type:'FeatureCollection';features:PointFeature<P>[];}
export interface DemandProperties {postcode:string;year:number;kwhPerDwelling:number|null;rawValue:number|null;missingReason:string|null;dwellings:number|null;}
export interface DemandFeature {type:'Feature';id:string;properties:DemandProperties;geometry:{type:'MultiPolygon';coordinates:number[][][][]};}
export interface DemandData {type:'FeatureCollection';features:DemandFeature[];}
export const PRODUCER_COLORS:Record<string,string>={Wind:'#2196a5',Solar:'#e0a521',Gas:'#778694',Coal:'#394958',Biomass:'#618353',Hydro:'#3478b8',Nuclear:'#9762bd',Waste:'#a5744f',Other:'#84949f'};
export function producerMatches(p:Producer,query:string,technologies:string[]){return technologies.includes(p.technology)&&`${p.name} ${p.operator} ${p.kind}`.toLowerCase().includes(query.toLowerCase());}
