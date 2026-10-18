import {existsSync} from 'node:fs';
if(process.env.GRID_SELF_HOSTED!=='1')throw Error('GRID_SELF_HOSTED=1 is required for this build');
const origin=new URL(process.env.APP_ORIGIN||'');
if(!['https:','http:'].includes(origin.protocol)||origin.origin!==process.env.APP_ORIGIN)throw Error('APP_ORIGIN must be an origin, e.g. https://grid.humza.xyz');
if(!existsSync('drizzle'))throw Error('Missing database migrations');
// No shell wrapper: Node receives container SIGTERM directly.
await import('../server.js');
