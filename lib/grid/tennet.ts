export const TENNET_URL='https://api.tennet.eu/publications/v1/balance-delta-high-res/latest';
export const BALANCING_SERVICES=['afrr','igcc','mfrrda','picasso','mari'] as const;
export type BalancingPoint={start:string;end:string;values:Record<string,number|null>};
function numeric(v:unknown):number|null{if(v==null||v==='')return null;if(typeof v!=='string'&&typeof v!=='number')throw Error('Invalid quantity');if(typeof v==='string'&&!/^-?\d+(\.\d+)?$/.test(v))throw Error('Invalid quantity');const n=Number(v);if(!Number.isFinite(n))throw Error('Invalid quantity');return n;}
function utc(v:unknown):string{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/.test(v))throw Error('Invalid time');const value=/(Z|[+-]\d{2}:\d{2})$/.test(v)?v:v+'Z';const t=Date.parse(value);if(!Number.isFinite(t))throw Error('Invalid time');return new Date(t).toISOString();}
export function normalizeTennet(body:unknown):BalancingPoint[]{
 if(body&&typeof body==='object'&&(body as Record<string,unknown>).error==='No data found')return [];
 const r=(body as {Response?:Record<string,unknown>})?.Response;if(r?.informationType!=='BALANCE_DELTA_HIGH_RES'||!Array.isArray(r.TimeSeries))throw Error('Unexpected TenneT contract');
 const points:BalancingPoint[]=[];const seen=new Set<string>();
 for(const series of r.TimeSeries){if(series.quantity_Measurement_Unit_name!=='MAW'||!Array.isArray(series.Period))throw Error('Unexpected unit or periods');for(const period of series.Period){if(!Array.isArray(period.points))throw Error('Missing points');for(const p of period.points){const start=utc(p.timeInterval_start),end=utc(p.timeInterval_end);if(end<=start||seen.has(start))throw Error('Invalid or duplicate interval');seen.add(start);const values:Record<string,number|null>={};for(const service of BALANCING_SERVICES)for(const direction of ['in','out']){const key=`power_${service}_${direction}`;values[key]=numeric(p[key]);}points.push({start,end,values});}}}
 return points.sort((a,b)=>a.start.localeCompare(b.start));
}
export type TennetResult={status:'connected'|'no_data';records:BalancingPoint[];fetchedAt:string;delivery:'upstream'|'cache';warning:string|null;sourceUrl:string};
