import {resolve} from 'node:path';
import {SqliteArchive} from './sqlite';
// Lazy initialization prevents builds from writing a database or needing keys.
let archive:SqliteArchive|undefined;
export const env={
 get DB():D1Database {
  archive??=new SqliteArchive(process.env.GRID_DB_PATH||'/data/grid.sqlite',resolve('drizzle'));
  return archive as unknown as D1Database;
 },
 get NED_API_KEY(){return process.env.NED_API_KEY;},
 get TENNET_API_KEY(){return process.env.TENNET_API_KEY;},
};
