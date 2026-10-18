'use client';
import type {BalancingPoint} from '@/lib/grid/tennet';
import {balancingPath} from '@/lib/grid/balancing-chart';
export function BalancingChart({records,service,index}:{records:BalancingPoint[];service:string;index:number}){
 if(!records.length)return null;const keys=[`power_${service}_in`,`power_${service}_out`];const values=records.flatMap(r=>keys.map(k=>r.values[k])).filter((x):x is number=>x!=null);if(!values.length)return <p>No reported values for this service.</p>;
 const low=Math.min(0,...values),high=Math.max(1,...values),start=Date.parse(records[0].start),last=Date.parse(records.at(-1)!.end);const x=(t:number)=>42+(t-start)/Math.max(1,last-start)*390,y=(v:number)=>150-(v-low)/(high-low)*125;
 const label=(t:string)=>new Date(t).toLocaleTimeString('en-GB',{timeZone:'Europe/Amsterdam',hour:'2-digit',minute:'2-digit'});
 return <figure className="balancing-chart"><figcaption><span style={{color:'#008578'}}>● Power in</span> <span style={{color:'#9861b4'}}>● Power out</span> · MW</figcaption><svg viewBox="0 0 450 185" role="img" aria-label={`${service.toUpperCase()} power in and out in MW; gaps indicate missing intervals`}><path d="M42 20V150H432" stroke="#cad9e2" fill="none"/><text x="3" y="28">{Math.round(high)}</text><text x="3" y="150">{Math.round(low)}</text>{keys.map((k,i)=><path key={k} d={balancingPath(records,k,x,y)} stroke={i?'#9861b4':'#008578'} strokeWidth="2" fill="none"/>)}<path d={`M${x(Date.parse(records[index].start))} 20V150`} stroke="#172f43" strokeDasharray="3 3"/><text x="42" y="174">{label(records[0].start)}</text><text x="432" y="174" textAnchor="end">{label(records.at(-1)!.end)}</text></svg></figure>;
}
