import type {Interval} from '@/lib/grid/types';
export function HistoryChart({intervals,index,metric='load'}:{intervals:Interval[];index:number;metric?:'load'|'generation'|'netImports'|'residual'}){
 const values=intervals.map(i=>i[metric]);const nums=values.filter((x):x is number=>x!==null);if(!nums.length)return <p>No reported intervals.</p>;
 const lo=Math.min(0,...nums),hi=Math.max(...nums),spread=hi-lo||1;
 const x=(i:number)=>12+i/Math.max(1,values.length-1)*276;const y=(v:number)=>75-(v-lo)/spread*62;
 let path='';let open=false;values.forEach((v,i)=>{if(v===null){open=false;return;}path+=`${open?'L':'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;open=true;});
 return <svg className="history-chart" viewBox="0 0 300 96" role="img" aria-label={`${metric} over the available intervals; selected interval ${index+1}`}><path d="M12 76H288" stroke="#dce5eb"/><path d={path} stroke="#008578" fill="none" strokeWidth="2.2"/><path d={`M${x(index)} 6V77`} stroke="#97adb8" strokeDasharray="3 3"/>{values[index]!==null&&<circle cx={x(index)} cy={y(values[index]!)} r="4" fill="#008578"/>}<text x="12" y="92">Start</text><text x="253" y="92">Latest</text></svg>;
}
