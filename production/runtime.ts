import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,writeFileSync,existsSync,chmodSync} from 'node:fs';
import path from 'node:path';
export const dataDir=path.resolve(process.env.FE_DATA_DIR||path.join(process.cwd(),'private-data'));
mkdirSync(dataDir,{recursive:true,mode:0o770});
const configFile=path.join(dataDir,'config.json');
const config=existsSync(configFile)?JSON.parse(readFileSync(configFile,'utf8')):{};
const database=new DatabaseSync(path.join(dataDir,'site.sqlite'));
database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS entities(id TEXT PRIMARY KEY,kind TEXT NOT NULL,payload TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY,kind TEXT,name TEXT,phone TEXT,payload TEXT,status TEXT DEFAULT 'Новая',created_at TEXT,notification TEXT);
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,name TEXT,created_at TEXT,metadata TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,action TEXT,entity TEXT,role TEXT,created_at TEXT);
CREATE INDEX IF NOT EXISTS leads_phone_time ON leads(phone,created_at);
CREATE INDEX IF NOT EXISTS events_time ON events(created_at);`);
const mediaDir=path.join(dataDir,'media');mkdirSync(mediaDir,{recursive:true,mode:0o770});
class Statement {
 values:any[]=[];
 constructor(private sql:string){}
 bind(...values:any[]){this.values=values;return this;}
 async all(){return {results:database.prepare(this.sql).all(...this.values)};}
 async first(){return database.prepare(this.sql).get(...this.values)||null;}
 async run(){return database.prepare(this.sql).run(...this.values);}
}
export const env:any={...config,DB:{prepare:(sql:string)=>new Statement(sql)},BUCKET:{
 async put(key:string,body:ArrayBuffer,options:any){const bytes=Buffer.from(body);const type=bytes.subarray(0,3).equals(Buffer.from([255,216,255]))?'image/jpeg':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'image/webp':null;if(!type||type!==options.httpMetadata.contentType)throw Error('Invalid image');writeFileSync(path.join(mediaDir,key),bytes,{mode:0o660});writeFileSync(path.join(mediaDir,key+'.json'),JSON.stringify({contentType:type}),{mode:0o660});},
 async get(key:string){if(!/^[a-f0-9-]{36}$/.test(key)||!existsSync(path.join(mediaDir,key)))return null;const meta=JSON.parse(readFileSync(path.join(mediaDir,key+'.json'),'utf8'));return {body:readFileSync(path.join(mediaDir,key)),writeHttpMetadata:(headers:Headers)=>headers.set('Content-Type',meta.contentType)};}
}};
if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<24)throw Error('Set a unique ADMIN_PASSWORD of at least 24 characters in the private configuration.');
export function audit(action:string,entity:string,role:string){database.prepare('INSERT INTO audit(action,entity,role,created_at) VALUES(?,?,?,?)').run(action,entity,role,new Date().toISOString());}
export function backup(){const filename='backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite';database.exec('VACUUM INTO '+"'"+path.join(dataDir,filename).replace(/'/g,"''")+"'");return filename;}
