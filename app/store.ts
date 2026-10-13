import { env } from 'cloudflare:workers';
import { catalogueProducts, collectionLooks, defaultSettings } from './data';
import type {Product, Look, Settings} from './data';
export async function loadStore(){
 let products=catalogueProducts, looks=collectionLooks, settings=defaultSettings, reviews:any[]=[];
 try {
  const data=await env.DB!.prepare('SELECT id, kind, payload FROM entities').all<{id:string;kind:string;payload:string}>();
  const rows=data.results || [];
  const overrides=new Map(rows.filter(r=>r.kind==='product').map(r=>[r.id,JSON.parse(r.payload)]));
  products=[...catalogueProducts.map(p=>overrides.get(p.id)||p),...Array.from(overrides.values()).filter((p:any)=>!p.demo&&!catalogueProducts.some(d=>d.id===p.id))];
  const lo=new Map(rows.filter(r=>r.kind==='look').map(r=>[r.id,JSON.parse(r.payload)]));
  looks=[...collectionLooks.map(p=>lo.get(p.id)||p),...Array.from(lo.values()).filter((p:any)=>!collectionLooks.some(d=>d.id===p.id))];
  const config=rows.find(r=>r.kind==='settings'); if(config) settings={...defaultSettings,...JSON.parse(config.payload)};
  reviews=rows.filter(r=>r.kind==='review').map(r=>({id:r.id,...JSON.parse(r.payload)})).filter(r=>r.published);
 } catch{ console.error('Catalogue data unavailable; serving imported catalogue'); }
 return {products:products as Product[],looks:looks as Look[],settings:settings as Settings,reviews};
}
export function db(){if(!env.DB)throw new Error('DB unavailable');return env.DB;}
export async function saveEntity(id:string,kind:string,payload:any){return db().prepare('INSERT INTO entities(id,kind,payload,updated_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,payload=excluded.payload,updated_at=excluded.updated_at').bind(id,kind,JSON.stringify(payload),new Date().toISOString()).run();}
