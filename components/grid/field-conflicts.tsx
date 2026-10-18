import evidence from '@/data/cross-source-conflicts.json';
type Conflict={field:string;basis:string;sources:{name:string;value:string;url:string}[]};
export function FieldConflicts({id}:{id:string}){
 const conflicts=(evidence as Record<string,Conflict[]>)[id];
 if(!conflicts?.length)return null;
 return <section className="detail-section map-record-proof"><h3>Sources disagree</h3>{conflicts.map(c=><div key={c.field}><p><strong>{c.field} needs review</strong></p><dl className="source-facts">{c.sources.map(s=><div key={s.name}><dt>{s.name}</dt><dd>{s.value}<br/><a href={s.url} target="_blank" rel="noreferrer">Inspect source record ↗</a></dd></div>)}</dl><p>{c.basis}</p></div>)}<a href="/data/cross-check/field-conflicts.json" target="_blank" rel="noreferrer">Cross-source conflict evidence</a></section>;
}
