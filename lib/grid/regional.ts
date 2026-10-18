export type RegionalMetric='deliveryKwh'|'netDeliveryKwh'|'solarMwp'|'inverterMw'|'installations';
export type RegionalProperties={code:string;name:string;year:number;deliveryKwh:number|null;netDeliveryKwh:number|null;solarMwp:number|null;inverterMw:number|null;installations:number|null};
export type RegionalFeature={type:'Feature';id:string;properties:RegionalProperties;geometry:{type:'MultiPolygon';coordinates:number[][][][]}};
export type RegionalData={type:'FeatureCollection';features:RegionalFeature[]};
export const REGIONAL_METRICS:Record<RegionalMetric,{label:string;unit:string;short:string;stops:number[];colors:string[]}>={
 deliveryKwh:{label:'Household grid delivery',unit:'kWh / dwelling / year',short:'kWh / dwelling',stops:[0,1500,2500,3500,5000],colors:['#eef7fb','#c8e3f1','#6fb3d2','#2c6ea3','#583875']},
 netDeliveryKwh:{label:'Net household delivery',unit:'kWh / dwelling / year',short:'net kWh / dwelling',stops:[0,1000,2000,3000,4000],colors:['#eef7fb','#c8e3f1','#6fb3d2','#2c6ea3','#583875']},
 solarMwp:{label:'Installed solar panel capacity',unit:'MWp',short:'MWp',stops:[0,25,75,150,300],colors:['#fff7d5','#f5d47f','#e4ad32','#ba681c','#793a1d']},
 inverterMw:{label:'Installed inverter capacity',unit:'MW',short:'MW inverters',stops:[0,25,75,150,300],colors:['#fff7d5','#f5d47f','#e4ad32','#ba681c','#793a1d']},
 installations:{label:'Solar installations',unit:'installations',short:'installations',stops:[0,2500,7500,15000,30000],colors:['#fff7d5','#f5d47f','#e4ad32','#ba681c','#793a1d']}
};
export function regionalValue(value:number|null|undefined,metric:RegionalMetric):string {return value==null?'Not published':value.toLocaleString('en',{maximumFractionDigits:metric==='solarMwp'||metric==='inverterMw'?1:0});}
