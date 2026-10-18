import {DatabaseSync, type SQLInputValue} from 'node:sqlite';
import {mkdirSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {createHash} from 'node:crypto';

/** Small D1-compatible adapter for the queries used by this app. One Node
 * process owns the connection; synchronous transactions cannot interleave. */
export class SqliteArchive {
 readonly connection:DatabaseSync;
 constructor(filename:string,migrations:string){
  if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
  this.connection=new DatabaseSync(filename);
  this.connection.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
  this.connection.exec('CREATE TABLE IF NOT EXISTS grid_migrations (name TEXT PRIMARY KEY, sha256 TEXT NOT NULL)');
  for(const name of readdirSync(migrations).filter(n=>n.endsWith('.sql')).sort()){
   const sql=readFileSync(join(migrations,name),'utf8'),hash=createHash('sha256').update(sql).digest('hex');
   this.connection.exec('BEGIN IMMEDIATE');
   try{
    const previous=this.connection.prepare('SELECT sha256 FROM grid_migrations WHERE name=?').get(name);
    if(previous&&previous.sha256!==hash)throw Error(`Migration checksum mismatch: ${name}`);
    if(!previous){this.connection.exec(sql);this.connection.prepare('INSERT INTO grid_migrations VALUES (?,?)').run(name,hash);}
    this.connection.exec('COMMIT');
   }catch(error){this.connection.exec('ROLLBACK');throw error;}
  }
 }
 prepare(sql:string){return new ArchiveStatement(this,sql);}
 async batch(statements:ArchiveStatement[]){
  this.connection.exec('BEGIN IMMEDIATE');
  try{const results=statements.map(statement=>statement.execute());this.connection.exec('COMMIT');return results;}
  catch(error){this.connection.exec('ROLLBACK');throw error;}
 }
 close(){this.connection.close();}
}
class ArchiveStatement {
 constructor(private db:SqliteArchive,private sql:string,private values:SQLInputValue[]=[]){ }
 bind(...values:SQLInputValue[]){return new ArchiveStatement(this.db,this.sql,values);}
 async first<T=Record<string,unknown>>(column?:string):Promise<T|null>{
  const row=this.db.connection.prepare(this.sql).get(...this.values);
  return row?(column?row[column]:row) as T:null;
 }
 async all<T=Record<string,unknown>>(){return {success:true,results:this.db.connection.prepare(this.sql).all(...this.values) as T[]};}
 execute(){const result=this.db.connection.prepare(this.sql).run(...this.values);return {success:true,meta:{changes:Number(result.changes)},results:[]};}
 async run(){return this.execute();}
}
