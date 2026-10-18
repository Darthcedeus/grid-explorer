'use client';
import {useMemo} from 'react';
import type {Interval} from '@/lib/grid/types';
import {intervalDelta,replayScale} from '@/lib/grid/replay';
const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Amsterdam',hour:'2-digit',minute:'2-digit'});
export function NationalReplay({interval,intervals,playing,demo,source}:{interval:Interval;intervals:Interval[];playing:boolean;demo:boolean;source:string}){
 const scale=useMemo(()=>replayScale(intervals),[intervals]);
 const previous=intervals[intervals.findIndex(i=>i.start===interval.start)-1];
 return <details className="national-replay" open>
 <summary><span>National replay</span><small>{clock.format(new Date(interval.start))} · {playing?'Playing':'Paused'}</small></summary>
 <div className="national-replay-body"><p>{demo?'Illustrative scenario':source} · Netherlands totals</p>
 {(['generation','load','netImports'] as const).map(key=>{const value=interval[key];const delta=intervalDelta(interval,previous,key);const label=key==='generation'?'Generation':key==='load'?'Demand':value===null?'Net exchange':value<0?'Net export':'Net import';return <div className={'replay-row replay-'+key} key={key}><div><span>{label}</span><strong>{value===null?'Unavailable':`${(Math.abs(value)/1000).toFixed(2)} GW`}</strong></div><div className="replay-bar"><i style={{width:value===null?'0%':`${Math.abs(value)/scale*100}%`}}/></div><small>{delta===null?'Change unavailable':`${delta>0?'+':''}${Math.round(delta).toLocaleString()} MW vs previous interval`}{key==='netImports'?' · signed net import':''}</small></div>;})}
 <p className="replay-footnote">Shared scale: 0–{scale/1000} GW. Map locations and annual statistics stay static. These totals are not allocated to individual sites.</p></div>
 </details>;
}
