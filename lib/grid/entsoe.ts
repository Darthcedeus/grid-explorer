import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {ENTSOE_PRODUCTS,NL_EIC,type EntsoeProduct,type EntsoeData,type EntsoeSeries,type EntsoePoint} from './entsoe-contract.ts';
type Xml=Record<string,unknown>;
function obj(v:unknown):Xml{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid XML structure');return v as Xml;}
function list(v:unknown):unknown[]{return v===undefined?[]:Array.isArray(v)?v:[v];}
function scalar(v:unknown):string{if(v&&typeof v==='object')return scalar(obj(v)['#text']);return typeof v==='string'||typeof v==='number'?String(v).trim():'';}
function timestamp(v:unknown):number{const s=scalar(v);if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?Z$/.test(s)||!Number.isFinite(Date.parse(s)))throw Error('Invalid UTC timestamp');return Date.parse(s);}
function numeric(v:unknown):number|null{const s=scalar(v);if(!s)return null;if(!/^-?\d+(\.\d+)?$/.test(s)||!Number.isFinite(Number(s)))throw Error('Invalid numeric value');return Number(s);}
export function entsoeWindow(day:string):{start:string;end:string}{
 if(!/^\d{4}-\d\d-\d\d$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)throw Error('Invalid date');
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
 const midnight=(date:string)=>{const base=Date.parse(date);for(let t=base-10800000;t<=base+3600000;t+=3600000){const p=Object.fromEntries(formatter.formatToParts(t).map(p=>[p.type,p.value]));if(`${p.year}-${p.month}-${p.day}`===date&&p.hour==='00')return new Date(t).toISOString();}throw Error('Cannot resolve local midnight');};
 return {start:midnight(day),end:midnight(new Date(Date.parse(day)+86400000).toISOString().slice(0,10))};
}
export function entsoeQuery(product:EntsoeProduct,day:string):URLSearchParams{
 const spec=ENTSOE_PRODUCTS[product],window=entsoeWindow(day),compact=(s:string)=>s.replace(/[-:TZ.]/g,'').slice(0,12);
 const params=new URLSearchParams({documentType:spec.documentType,[spec.domain]:NL_EIC,periodStart:compact(window.start),periodEnd:compact(window.end)});
 if(spec.processType)params.set('processType',spec.processType);if(product==='prices')params.set('out_Domain',NL_EIC);return params;
}
/** Parse only the reviewed aggregate products. DTDs/entities are never enabled. */
export function normalizeEntsoe(xml:string,product:EntsoeProduct,day:string):EntsoeData{
 if(/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw Error('Invalid XML');
 const parsed=new XMLParser({ignoreAttributes:true,removeNSPrefix:true,parseTagValue:false,processEntities:false}).parse(xml) as Xml;
 if(parsed.Acknowledgement_MarketDocument){const ack=obj(parsed.Acknowledgement_MarketDocument);const reasons=list(ack.Reason).map(r=>scalar(obj(r).code));if(reasons.length===1&&reasons[0]==='999'&&/No matching data found/i.test(scalar(obj(list(ack.Reason)[0]).text)))return {documentId:scalar(ack.mRID),revision:scalar(ack.revisionNumber),createdAt:scalar(ack.createdDateTime),series:[]};throw Error('ENTSO-E acknowledgement error');}
 const root=obj(parsed.GL_MarketDocument??parsed.Publication_MarketDocument);const spec=ENTSOE_PRODUCTS[product];
 if(scalar(root.type)!==spec.documentType||spec.processType&&scalar(root['process.processType'])!==spec.processType)throw Error('Unexpected ENTSO-E document');
 const window=entsoeWindow(day),from=Date.parse(window.start),until=Date.parse(window.end);const series:EntsoeSeries[]=[];const ids=new Set<string>();
 for(const raw of list(root.TimeSeries)){
  const s=obj(raw),id=scalar(s.mRID),curveType=scalar(s.curveType);if(!id||ids.has(id)||!['A01','A03'].includes(curveType))throw Error('Unsupported or duplicate series');ids.add(id);
  const domain=product==='generation'?(s['inBiddingZone_Domain.mRID']?'inBiddingZone_Domain':'outBiddingZone_Domain'):product==='renewablesForecast'?'inBiddingZone_Domain':spec.domain;
  const area=scalar(s[domain+'.mRID']);if(area!==NL_EIC||product==='prices'&&scalar(s['out_Domain.mRID'])!==NL_EIC)throw Error('Unexpected domain');
  const unit=product==='prices'?`${scalar(s['currency_Unit.name'])}/${scalar(s['price_Measure_Unit.name'])}`:scalar(s['quantity_Measure_Unit.name']);if(unit!==(product==='prices'?'EUR/MWH':'MAW'))throw Error('Unexpected unit');
  const points:EntsoePoint[]=[],seen=new Set<number>();
  for(const rawPeriod of list(s.Period)){
   const period=obj(rawPeriod),interval=obj(period.timeInterval),start=timestamp(interval.start),end=timestamp(interval.end),res=scalar(period.resolution).match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/),step=res?(Number(res[1]||0)*60+Number(res[2]||0))*60000:0;
   const count=(end-start)/step;if(!step||step<60000||step>3600000||!Number.isInteger(count)||count<=0||count>1500)throw Error('Unsupported period');
   const values=new Map<number,number|null>();let previous=0;
   for(const rawPoint of list(period.Point)){const p=obj(rawPoint),position=Number(scalar(p.position));if(!Number.isInteger(position)||position<=previous||position>count)throw Error('Invalid point position');previous=position;values.set(position,numeric(p[product==='prices'?'price.amount':'quantity']));}
   let held:number|null=null;
   for(let i=1;i<=count;i++){if(values.has(i))held=values.get(i)!;const t=start+(i-1)*step;if(t<from||t+step>until)continue;if(seen.has(t))throw Error('Overlapping periods');seen.add(t);points.push({start:new Date(t).toISOString(),end:new Date(t+step).toISOString(),value:curveType==='A03'?held:values.get(i)??null});}
  }
  const direction=scalar(s['inBiddingZone_Domain.mRID'])?'generation':scalar(s['outBiddingZone_Domain.mRID'])&&product==='generation'?'consumption':'unspecified';
  series.push({id,psrType:s.MktPSRType?scalar(obj(s.MktPSRType).psrType)||null:null,direction,unit:unit==='MAW'?'MW':'EUR/MWh',curveType,points:points.sort((a,b)=>a.start.localeCompare(b.start))});
 }
 return {documentId:scalar(root.mRID),revision:scalar(root.revisionNumber),createdAt:scalar(root.createdDateTime),series};
}
