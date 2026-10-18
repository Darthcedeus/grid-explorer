export const NED_OFFSHORE_POINTS=[28,29,30,31,33,34,35,36];
export function nedPage(body:unknown):{rows:unknown[];next:string|null}{
 if(!body||typeof body!=='object')throw Error('Invalid NED response');
 const d=body as Record<string,unknown>,rows=d['hydra:member']??d.member;
 if(!Array.isArray(rows))throw Error('Unrecognised NED collection');
 const view=(d['hydra:view']??d.view) as Record<string,unknown>|undefined;
 const next=view?.['hydra:next']??view?.next;
 if(next!=null&&typeof next!=='string')throw Error('Invalid pagination');
 if(typeof next==='string'){const u=new URL(next,'https://api.ned.nl');if(u.origin!=='https://api.ned.nl'||u.pathname!=='/v1/utilizations'||u.username||u.password||u.hash)throw Error('Unexpected pagination origin');return {rows,next:u.href};}
 return {rows,next:null};
}
