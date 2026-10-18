import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {renderToString} from 'react-dom/server';
import React from 'react';
import Storefront from '../app/storefront';
import {loadStore,db,saveEntity} from '../app/store';
import {adminRole,sameOrigin} from '../app/admin-auth';
import * as admin from '../app/api/admin/route';
import * as leads from '../app/api/leads/route';
import * as events from '../app/api/events/route';
import * as upload from '../app/api/media/route';
import * as media from '../app/media/[key]/route';
import {env,audit,backup} from './runtime';

const root=path.resolve(__dirname,'public');
const origin=(env.SITE_URL||'http://127.0.0.1:5190').replace(/\/$/,'');
const indexing=env.SITE_INDEXING==='enabled';
const pages:Record<string,string>={'/':'Формула Элегантности — пространство персонального стиля','/catalog':'Каталог женской одежды','/looks':'Готовые образы','/capsules':'Капсулы','/about':'О шоуруме','/gallery':'Галерея','/services':'Услуги стилиста и визажиста','/prices':'Услуги и цены','/contacts':'Контакты','/booking':'Записаться к стилисту','/certificates':'Подарочные сертификаты','/reviews':'Отзывы','/favorites':'Избранное','/privacy':'Обработка персональных данных','/admin':'Управление сайтом'};
const escape=(value:any)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const rate=new Map<string,{count:number;until:number}>();
function limited(key:string,max:number,ms:number){const now=Date.now();if(rate.size>10000)for(const [k,v]of rate)if(v.until<now)rate.delete(k);const entry=rate.get(key);if(!entry||entry.until<now){rate.set(key,{count:1,until:now+ms});return false;}return ++entry.count>max;}
async function adminRequest(req:Request,ip:string){
 if(req.method==='GET')return admin.GET(req);
 if(!sameOrigin(req)||!req.headers.get('origin'))return Response.json({error:'Недопустимый источник'},{status:403});
 const body=await req.clone().json() as any;
 if(body.action==='login'&&limited('login:'+ip,10,15*60000))return Response.json({error:'Слишком много попыток. Повторите через 15 минут.'},{status:429});
 const role=await adminRole(req);
 if(['archive','restore','backup'].includes(body.action)){
  if(!role)return Response.json({error:'Нет доступа'},{status:401});
  if(body.action==='backup'){if(role!=='admin')return Response.json({error:'Нет доступа'},{status:403});const filename=backup();audit('backup',filename,role);return Response.json({ok:true,message:'Резервная копия создана в закрытом каталоге сервера.'});}
  if(!['product','look','review'].includes(body.kind)||typeof body.id!=='string')return Response.json({error:'Некорректные данные'},{status:400});
  const store=await loadStore();const list=body.kind==='product'?store.products:body.kind==='look'?store.looks:(await db().prepare("SELECT payload,id FROM entities WHERE kind='review'").all()).results.map((r:any)=>({id:r.id,...JSON.parse(r.payload)}));
  const entity=list.find((r:any)=>r.id===body.id);if(!entity)return Response.json({error:'Запись не найдена'},{status:404});
  await saveEntity(body.id,body.kind,{...entity,archived:body.action==='archive',published:body.action==='restore'?false:false});audit(body.action,body.kind+':'+body.id,role);return Response.json({ok:true});
 }
 const result=await admin.POST(req);if(result.ok&&role&&!['login','logout'].includes(body.action))audit(body.action,String(body.kind||'lead')+':'+String(body.id||''),role);return result;
}
async function handle(req:Request,ip:string):Promise<Response>{
 const url=new URL(req.url),pathname=decodeURIComponent(url.pathname).replace(/\/$/,'')||'/';
 if(pathname==='/healthz')return Response.json({ok:true});
 if(pathname.startsWith('/api/')||pathname.startsWith('/media/')){
  if(pathname==='/api/admin'&&['GET','POST'].includes(req.method))return adminRequest(req,ip);
  if(pathname==='/api/media'&&req.method==='POST')return upload.POST(req);
  if(pathname.startsWith('/media/')&&['GET','HEAD'].includes(req.method))return media.GET(req,{params:Promise.resolve({key:pathname.slice(7)})});
  if(req.method==='POST'&&pathname==='/api/leads'){if(limited('lead:'+ip,25,3600000))return Response.json({error:'Слишком много заявок. Позвоните в шоурум.'},{status:429});return leads.POST(req);}
  if(req.method==='POST'&&pathname==='/api/events'){if(limited('event:'+ip,600,60000))return new Response(null,{status:429});return events.POST(req);}
  return Response.json({error:'Не найдено'},{status:404});
 }
 if(!['GET','HEAD'].includes(req.method))return new Response('Method not allowed',{status:405});
 if(pathname==='/robots.txt')return new Response(indexing?`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /favorites\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
 if(pathname.startsWith('/assets/')||pathname.startsWith('/images/')||pathname.startsWith('/fonts/')||pathname==='/favicon.svg'){
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))return new Response('Not found',{status:404});
  try{if(!(await stat(file)).isFile())throw Error();const ext=path.extname(file);const mime:Record<string,string>={'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.ttf':'font/ttf','.woff2':'font/woff2'};return new Response(await readFile(file),{headers:{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':'public, max-age=86400'}});}catch{return new Response('Not found',{status:404});}
 }
 const store=await loadStore();const publicStore={...store,products:store.products.filter(p=>p.published&&!(p as any).archived),looks:store.looks.filter(p=>p.published&&!(p as any).archived),settings:{...store.settings,pages:store.settings.pages.filter(p=>p.published),promos:[]}};
 const product=pathname.startsWith('/product/')?publicStore.products.find(p=>p.id===pathname.slice(9)):null;
 const look=pathname.startsWith('/look/')?publicStore.looks.find(p=>p.id===pathname.slice(6)):null;
 const custom=(store.settings as any).pages?.find((p:any)=>p.published&&'/'+p.slug===pathname);
 const pageSeo=(store.settings as any).seo?.[pathname]||{};
 const known=!!pages[pathname]||!!product||!!look||!!custom;
 if(pathname==='/sitemap.xml'){
  const urls=[...Object.keys(pages).filter(p=>!['/admin','/favorites','/privacy'].includes(p)),...publicStore.products.map(p=>'/product/'+p.id),...publicStore.looks.map(p=>'/look/'+p.id),...((store.settings as any).pages||[]).filter((p:any)=>p.published).map((p:any)=>'/'+p.slug)];
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(p=>'<url><loc>'+escape(origin+p)+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8'}});
 }
 const title=product?.seoTitle||product?.name||look?.name||custom?.title||pageSeo.title||pages[pathname]||'Страница не найдена';
 const description=product?.seoDescription||product?.description||look?.description||pageSeo.description||store.settings.intro;
 const noindex=!indexing||!known||['/admin','/favorites','/privacy'].includes(pathname);
 const head=`<title>${escape(title)}${pathname==='/'?'':' | Формула Элегантности'}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${noindex?'noindex, nofollow':'index, follow'}"><link rel="canonical" href="${escape(origin+pathname)}"><meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(origin+pathname)}"><meta property="og:image" content="${escape(origin+(product?.image||look?.image||store.settings.hero))}">`;
 const body=renderToString(<Storefront initialPath={pathname+url.search} {...publicStore}/>);
 const data=JSON.stringify(publicStore).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const template=await readFile(path.join(__dirname,'template.html'),'utf8');
 return new Response(template.replace('<!--SITE_HEAD-->',head).replace('<!--SITE_BODY-->',body).replace('<script id="site-data" type="application/json">{}</script>',`<script id="site-data" type="application/json">${data}</script>`),{status:known?200:404,headers:{'Content-Type':'text/html; charset=utf-8'}});
}
export const server=createServer(async(incoming,outgoing)=>{
 try{
  const chunks:Buffer[]=[];let bytes=0;for await(const chunk of incoming){bytes+=chunk.length;if(bytes>9*1024*1024){outgoing.writeHead(413);outgoing.end('Request too large');return;}chunks.push(chunk);}
  const req=new Request(origin+(incoming.url||'/'),{method:incoming.method,headers:incoming.headers as any,...(!['GET','HEAD'].includes(incoming.method||'GET')?{body:Buffer.concat(chunks)}:{})});
  const result=await handle(req,incoming.socket.remoteAddress||'unknown');
  outgoing.setHeader('X-Content-Type-Options','nosniff');outgoing.setHeader('X-Frame-Options','DENY');outgoing.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  outgoing.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  outgoing.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self'; frame-src https://maps.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  if((incoming.url||'').startsWith('/api/')||(incoming.url||'').startsWith('/admin')){outgoing.setHeader('Cache-Control','no-store');outgoing.setHeader('X-Robots-Tag','noindex, nofollow');}
  else if(result.headers.get('Content-Type')?.includes('text/html'))outgoing.setHeader('Cache-Control','no-cache');
  result.headers.forEach((value,key)=>outgoing.setHeader(key,value));outgoing.writeHead(result.status);outgoing.end(incoming.method==='HEAD'?undefined:Buffer.from(await result.arrayBuffer()));
 }catch{outgoing.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});outgoing.end('Сервис временно недоступен. Пожалуйста, позвоните в шоурум.');}
});
server.requestTimeout=30000;
server.listen(Number(process.env.PORT)||5190,'0.0.0.0',()=>console.log('Formula Elegantnosti server ready'));
