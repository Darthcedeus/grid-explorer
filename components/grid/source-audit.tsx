'use client';
import {useEffect,useState} from 'react';
import {ClipboardCheck,ChevronRight} from 'lucide-react';
import {Sheet,SheetTrigger,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';

type AuditCheck={title:string;status:string;detail:string;stats:Record<string,unknown>;file:string|null};
type Layer={dataset:string;records:number;duplicateIds:number;invalidGeometry:number;emptyGeometry:number;missingObjectLinks:number};
type Audit={checkedAt:string;scope:string;checks:AuditCheck[];inventory:Layer[];files:unknown[];limitations:string[];nextSteps:string[]};
const label=(s:string)=>s.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,x=>x.toUpperCase());
const status:Record<string,string>={checked:'Checks completed',review:'Review candidates',gap:'Verification gap',corrected:'Corrected'};

function Facts({value}:{value:unknown}){
 if(value===null||value===undefined)return <>Unavailable</>;
 if(typeof value==='boolean')return <>{value?'Yes':'No'}</>;
 if(typeof value==='number')return <>{value.toLocaleString('en',{maximumFractionDigits:6})}</>;
 if(typeof value==='string')return <>{value}</>;
 if(Array.isArray(value))return <div className="audit-fact-list">{value.map((v,i)=><div key={i}><Facts value={v}/></div>)}</div>;
 return <dl className="audit-facts">{Object.entries(value as Record<string,unknown>).map(([k,v])=><div key={k}><dt>{label(k)}</dt><dd><Facts value={v}/></dd></div>)}</dl>;
}

export function SourceAudit(){
 const [open,setOpen]=useState(false);
 return <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><button className="rvo-register-trigger audit-trigger"><ClipboardCheck size={19}/><span>Cross-source audit<small>Findings, unresolved matches and source coverage</small></span><ChevronRight size={16}/></button></SheetTrigger><SheetContent side="right" className="rvo-drawer audit-drawer"><SheetHeader><SheetTitle>Cross-source data audit</SheetTitle><SheetDescription>Automated validation of saved datasets and available hosted archive metadata</SheetDescription></SheetHeader>{open&&<AuditResults/>}</SheetContent></Sheet>;
}

function AuditResults(){
 const [data,setData]=useState<Audit|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const c=new AbortController();setError('');fetch('/data/cross-check/summary.json',{signal:c.signal}).then(r=>{if(!r.ok)throw Error('load');return r.json();}).then(d=>{if(!c.signal.aborted)setData(d as Audit);}).catch(e=>{if(e.name!=='AbortError')setError('The audit could not load.');});return()=>c.abort();},[attempt]);
 if(error)return <div className="audit-content" role="alert"><p>{error}</p><button onClick={()=>setAttempt(x=>x+1)}>Retry</button></div>;
 if(!data)return <p className="audit-content" role="status">Loading audit results…</p>;
 const features=data.inventory.reduce((n,x)=>n+x.records,0),gaps=data.checks.filter(x=>x.status==='gap').length;
 return <div className="audit-content"><p className="audit-date">Checked {new Date(data.checkedAt).toLocaleString('en-GB',{timeZone:'UTC'})} UTC · saved audit, not continuous monitoring</p><p>{data.scope}</p><div className="audit-totals"><div><strong>{features.toLocaleString()}</strong><span>Map features checked</span></div><div><strong>{data.files.length}</strong><span>JSON / GeoJSON files inventoried</span></div><div><strong>{gaps}</strong><span>Checks with verification gaps</span></div></div><p className="audit-notice">Candidate matches are not confirmed identities. This audit does not certify that every mapped site exists or is operating today. No live plant output, voltage or capacity is inferred from proximity.</p><a className="audit-download" href="/data/cross-check/summary.json" download>Download complete audit and file hashes</a><p><a href="/data/cross-check/report.md" download>Download readable audit report</a></p><h3>Findings by source</h3><div className="audit-checks">{data.checks.map(c=><article key={c.title}><span className={'audit-status audit-'+c.status}>{status[c.status]||c.status}</span><h4>{c.title}</h4><p>{c.detail}</p>{Object.keys(c.stats).length>0&&<details><summary>Results and counts</summary><Facts value={c.stats}/></details>}{c.file&&<a href={'/data/cross-check/'+c.file} download>Download record-level evidence</a>}</article>)}</div><h3>Every mapped dataset</h3><p>Objects can overlap across layers. Counts are not a count of unique physical sites. Object links apply to infrastructure and producer layers; administrative geography has dataset-level attribution.</p><div className="audit-table-wrap"><table><thead><tr><th>Dataset</th><th>Features</th><th>Duplicate IDs</th><th>Invalid shapes</th><th>Missing object links</th></tr></thead><tbody>{data.inventory.map(x=><tr key={x.dataset}><td>{x.dataset}</td><td>{x.records.toLocaleString()}</td><td>{x.duplicateIds}</td><td>{x.invalidGeometry}</td><td>{x.missingObjectLinks}</td></tr>)}</tbody></table></div><h3>Next actions</h3><ol>{data.nextSteps.map(s=><li key={s}>{s}</li>)}</ol><h3>What this audit cannot establish</h3><ul>{data.limitations.map(s=><li key={s}>{s}</li>)}</ul></div>;
}
