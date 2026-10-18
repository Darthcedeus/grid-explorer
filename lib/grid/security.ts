/** Identity is trustworthy only behind Sites' dispatcher, which owns sign-in
 * and audience authorization. Its observed identity contract supplies email;
 * user ID can be absent. Self-hosted mode delegates access control to Caddy. */
export function apiGuard(request:Request):Response|null{
 const deny=(error:string,status:number)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
 if(process.env.GRID_SELF_HOSTED!=='1'&&!request.headers.get('oai-authenticated-user-email')?.trim())return deny('Sign in to access this API.',401);
 if(request.url.length>2048)return deny('Request URL is too long.',414);
 const origin=request.headers.get('origin');
 const expectedOrigin=process.env.GRID_SELF_HOSTED==='1'?process.env.APP_ORIGIN:new URL(request.url).origin;
 if(process.env.GRID_SELF_HOSTED==='1'&&!expectedOrigin)return deny('APP_ORIGIN is not configured.',503);
 if(request.headers.get('sec-fetch-site')==='cross-site'||origin&&origin!==expectedOrigin)return deny('Cross-site API requests are not allowed.',403);
 return null;
}

/** Limit decoded response bytes while streaming, including chunked bodies. */
export async function boundedText(response:Response,maxBytes=2_000_000):Promise<string>{
 const size=Number(response.headers.get('content-length'));
 if(Number.isFinite(size)&&size>maxBytes){await response.body?.cancel();throw Error('Upstream response exceeds size limit');}
 if(!response.body)throw Error('Empty upstream response');
 const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0,text='';
 try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>maxBytes)throw Error('Upstream response exceeds size limit');text+=decoder.decode(chunk.value,{stream:true});}return text+decoder.decode();}
 catch(e){await reader.cancel().catch(()=>{});throw e;}
 finally{reader.releaseLock();}
}

export interface LeaseDatabase{prepare(sql:string):{bind(...values:(string|number)[]):{first():Promise<unknown>}};}
/** A bounded, provider-global lease cannot be bypassed by changing dates/IDs.
 * Failed attempts also consume the window. D1 atomically arbitrates isolates. */
export async function acquireSourceLease(db:LeaseDatabase,source:'ned'|'energy',ttlMs:number,now=Date.now()):Promise<boolean>{
 const row=await db.prepare('INSERT INTO source_cache (key,artifact_id,expires_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET expires_at=excluded.expires_at WHERE source_cache.expires_at<=? RETURNING key').bind('security:'+source+':lease','reserved',now+ttlMs,now).first();
 return Boolean(row);
}

/** Workers supports manual redirects, but not redirect: error. Never forward
 * provider credentials to a redirect destination, even on the same origin. */
export async function fetchWithoutRedirects(input:string,init:RequestInit={}):Promise<Response>{
 const response=await fetch(input,{...init,cache:'no-store',redirect:'manual'});
 if(response.status>=300&&response.status<400){
  await response.body?.cancel();
  throw Error(`Upstream redirect rejected (HTTP ${response.status})`);
 }
 return response;
}
