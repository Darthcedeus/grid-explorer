'use client';
import {useEffect,useState} from 'react';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {ENTSOE_PRODUCTS,PSR_NAMES,type EntsoeProduct,type EntsoeResult,type EntsoePoint} from '@/lib/grid/entsoe-contract';
import {dutchDay} from '@/lib/grid/freshness';
import {downloadText} from '@/lib/grid/comparison';
const time=(s:string)=>new Date(s).toLocaleString('en-GB',{timeZone:'Europe/Amsterdam',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});
function pathFor(points:EntsoePoint[]){
 const values=points.flatMap(p=>p.value===null?[]:[p.value]);if(!values.length)return '';
 const min=Math.min(...values),span=Math.max(...values)-min||1,from=Date.parse(points[0].start),duration=Date.parse(points.at(-1)!.end)-from;
 let path='',previousEnd='';for(const p of points){if(p.value===null){previousEnd='';continue;}const x=30+640*(Date.parse(p.start)-from)/duration,y=160-130*(p.value-min)/span;path+=`${previousEnd===p.start?'L':'M'}${x.toFixed(2)},${y.toFixed(2)} `;previousEnd=p.end;}return path;
}
function EntsoeContent(){
 const [product,setProduct]=useState<EntsoeProduct>('load'),[day,setDay]=useState(()=>dutchDay()),[refresh,setRefresh]=useState(0);
 const [data,setData]=useState<EntsoeResult|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[seriesIndex,setSeriesIndex]=useState(0),[index,setIndex]=useState(0);
 function reset(){setLoading(true);setError('');setData(null);}
 useEffect(()=>{const controller=new AbortController();
  fetch(`/api/entsoe?product=${product}&date=${day}`,{signal:controller.signal}).then(async response=>{const result=await response.json() as EntsoeResult&{error?:string};if(!response.ok)throw Error(result.error||'ENTSO-E unavailable');if(controller.signal.aborted)return;setData(result);setSeriesIndex(0);const points=result.series[0]?.points||[];let selected=points.length-1;if(product==='load'||product==='generation'){while(selected>0&&(Date.parse(points[selected].end)>Date.now()||points[selected].value===null))selected--;}setIndex(Math.max(0,selected));}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[product,day,refresh]);
 const series=data?.series[seriesIndex],points=series?.points||[],point=points[Math.min(index,Math.max(0,points.length-1))];
 const tomorrow=new Date(Date.parse(dutchDay())+86400000).toISOString().slice(0,10);
 return <div className="drawer-body entsoe-content"><p>Direct Dutch system observations, forecasts and market prices. This panel has its own date and is separate from the map replay. Values are never added to Energy-Charts totals.</p>
 <label>Dataset <select aria-label="ENTSO-E dataset" value={product} onChange={e=>{reset();setProduct(e.target.value as EntsoeProduct);}}>{Object.entries(ENTSOE_PRODUCTS).map(([key,spec])=><option key={key} value={key}>{spec.label}</option>)}</select></label>
 <label>Amsterdam calendar date <input aria-label="ENTSO-E date" type="date" min="2015-01-01" max={tomorrow} value={day} onChange={e=>{if(e.target.value){reset();setDay(e.target.value);}}}/></label>
 <button className="secondary-button" disabled={loading} onClick={()=>{reset();setRefresh(v=>v+1);}}>{loading?'Retrieving ENTSO-E…':'Refresh ENTSO-E'}</button>
 <p role="status">{error||data?.warning||(data?.status==='no_data'?'No observations published for this dataset and date.':'')}</p>
 {data&&<><p className="minor">{data.delivery==='cache'?'Archived':'Retrieved'} · {time(data.fetchedAt)}. Retrieval time differs from observation time. Original series resolution is retained; 23/25-hour days are supported.</p>
 {data.series.length>1&&<label>Reported series <select aria-label="ENTSO-E series" value={seriesIndex} onChange={e=>{setSeriesIndex(Number(e.target.value));setIndex(0);}}>{data.series.map((s,i)=><option key={s.id} value={i}>{PSR_NAMES[s.psrType||'']||s.psrType||'National'} · {s.direction} · series {s.id}</option>)}</select></label>}
 {series&&point&&<><h3>{PSR_NAMES[series.psrType||'']||ENTSOE_PRODUCTS[product].label}</h3><p><strong>{point.value?.toLocaleString('en-GB',{maximumFractionDigits:3})??'Not reported'} {series.unit}</strong></p><p>{time(point.start)} – {time(point.end)}</p>
 <svg viewBox="0 0 700 200" role="img" aria-label={`${ENTSOE_PRODUCTS[product].label} in ${series.unit}`} style={{width:'100%',color:'var(--primary)'}}><path d="M30 20V160H670" fill="none" stroke="currentColor" opacity=".25"/><path d={pathFor(points)} fill="none" stroke="currentColor" strokeWidth="2"/><text x="30" y="190" fill="currentColor" fontSize="12">{time(points[0].start)}</text><text x="670" y="190" fill="currentColor" fontSize="12" textAnchor="end">{time(points.at(-1)!.end)}</text></svg>
 <label>Reported interval <input aria-label="ENTSO-E interval" type="range" min="0" max={Math.max(0,points.length-1)} value={Math.min(index,points.length-1)} onChange={e=>setIndex(Number(e.target.value))} style={{width:'100%'}}/></label>
 {data.series.length>1&&<table className="balancing-table"><thead><tr><th>Series at selected interval</th><th>{series.unit}</th></tr></thead><tbody>{data.series.map(s=><tr key={s.id}><td>{PSR_NAMES[s.psrType||'']||s.psrType} · {s.direction}</td><td>{s.points.find(p=>p.start===point.start&&p.end===point.end)?.value?.toLocaleString('en-GB',{maximumFractionDigits:2})??'Not reported'}</td></tr>)}</tbody></table>}
 <details><summary>Inspect {points.length} intervals</summary><div style={{maxHeight:260,overflow:'auto'}}><table className="balancing-table"><thead><tr><th>Interval start · Amsterdam</th><th>{series.unit}</th></tr></thead><tbody>{points.map(p=><tr key={p.start}><td>{time(p.start)}</td><td>{p.value??'Not reported'}</td></tr>)}</tbody></table></div></details></>}
 <button className="coverage-link" onClick={()=>downloadText(JSON.stringify(data,null,2),`entsoe-${product}-${day}.json`,'application/json')}>Download observations and provenance</button><p className="minor">Document {data.documentId} · revision {data.revision} · created {data.createdAt}. Payload revisions are archived separately.</p></>}
 <p>Actuals may be delayed or revised. Forecasts describe expected output, and day-ahead EUR/MWh prices are wholesale prices. Generation and consumption series remain separate. Missing values stay unavailable; no local plant or station loading is inferred.</p><p className="minor">Cached for 15 minutes. Refresh is demand-driven. Energy-Charts also republishes ENTSO-E data; agreement does not constitute independent measurement.</p><a href="https://transparency.entsoe.eu/" target="_blank" rel="noreferrer">ENTSO-E Transparency Platform and dataset reuse terms</a></div>;
}
export function EntsoePanel(){const [open,setOpen]=useState(false);return <><button className="secondary-button" onClick={()=>setOpen(true)}>ENTSO-E</button><Sheet open={open} onOpenChange={setOpen}><SheetContent className="readable-drawer" side="right"><SheetHeader><SheetTitle>ENTSO-E · Netherlands</SheetTitle><SheetDescription>Direct national electricity data and day-ahead prices</SheetDescription></SheetHeader>{open&&<EntsoeContent/>}</SheetContent></Sheet></>;}
