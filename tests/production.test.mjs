import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
const dir=await mkdtemp(path.join(tmpdir(),'formula-engine-'));
const origin='http://127.0.0.1:5193',adminKey=randomBytes(32).toString('hex'),contentKey=randomBytes(32).toString('hex');
await writeFile(path.join(dir,'config.json'),JSON.stringify({ADMIN_PASSWORD:adminKey,CONTENT_PASSWORD:contentKey,SITE_URL:origin,SITE_INDEXING:'enabled'}),{mode:0o600});
let processHandle;
async function start(){processHandle=spawn(process.execPath,['dist-production/server.cjs'],{env:{...process.env,PORT:'5193',FE_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{processHandle.stdout.on('data',d=>{if(d.toString().includes('server ready'))resolve()});processHandle.once('exit',()=>reject(Error('Server failed to start')));setTimeout(()=>reject(Error('Server timeout')),10000).unref();});}
async function stop(){if(!processHandle)return;const exit=new Promise(resolve=>processHandle.once('exit',resolve));processHandle.kill();await exit;}
let cookie='';
async function call(url,body,{keyCookie=cookie,foreign=false}={}){return fetch(origin+url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:foreign?'https://foreign.test':origin,...(keyCookie?{Cookie:keyCookie}:{})},...(body?{body:JSON.stringify(body)}:{})});}
try{
 await start();
 assert.equal((await call('/api/admin')).status,401);assert.equal((await call('/api/admin/export')).status,403);
 assert.equal((await call('/api/admin',{action:'login',key:'wrong'})).status,401);
 assert.equal((await call('/api/admin',{action:'login',key:adminKey},{foreign:true})).status,403);
 let login=await call('/api/admin',{action:'login',key:adminKey});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert.match(login.headers.get('set-cookie'),/SameSite=Strict/);
 let data=await(await call('/api/admin')).json();assert.equal(data.products.length,101);
 const product={...data.products[0],id:'engine-test-item',name:'ТЕСТ CMS',price:17800,demo:false,published:true,gallery:[data.products[0].image]};
 assert.equal((await call('/api/admin',{action:'save',kind:'product',id:product.id,payload:product})).status,200);
 assert.match(await(await call('/product/'+product.id)).text(),/ТЕСТ CMS/);
 assert.equal((await call('/api/admin',{action:'archive',kind:'product',id:product.id})).status,200);assert.equal((await call('/product/'+product.id)).status,404);
 assert.equal((await call('/api/admin',{action:'restore',kind:'product',id:product.id})).status,200);
 const settings={...data.settings,intro:'Проверка сохранения CMS',seo:{'/about':{title:'SEO заголовок',description:'Описание для поиска'}},pages:[{slug:'test-page',title:'Тестовая страница',text:'<script>alert(1)</script>',image:'',published:true}]};
 assert.equal((await call('/api/admin',{action:'save',kind:'settings',id:'settings',payload:settings})).status,200);
 assert.match(await(await call('/')).text(),/Проверка сохранения CMS/);
 const custom=await call('/test-page');assert.equal(custom.status,200);assert.match(await custom.text(),/&lt;script&gt;alert/);
 assert.match(await(await call('/about')).text(),/<title>SEO заголовок/);
 assert.equal((await call('/api/admin',{action:'save',kind:'settings',id:'settings',payload:{...settings,navigation:[{label:'bad',url:'//evil.test'}]}})).status,400);
 assert.match(await(await call('/robots.txt')).text(),/Allow: \//);assert.match(await(await call('/sitemap.xml')).text(),/test-page/);
 assert.match((await call('/admin')).headers.get('x-robots-tag'),/noindex/);
 assert.equal((await call('/private-data/config.json')).status,404);
 const body={kind:'fitting',name:'Проверка движка',phone:'+79001234567',consent:true,context:'Автотест',source:'website'};
 assert.equal((await call('/api/leads',{...body,consent:false})).status,400);
 assert.equal((await call('/api/leads',body,{foreign:true})).status,403);
 const lead=await call('/api/leads',body);assert.equal(lead.status,200);const leadId=(await lead.json()).id;
 data=await(await call('/api/admin')).json();assert.ok(data.leads.find(l=>l.id===leadId));
 assert.equal((await call('/api/admin',{action:'lead',id:leadId,status:'Подтверждена'})).status,200);
 const review=await call('/api/leads',{...body,kind:'review',comment:'Тестовый отзыв',rating:5});assert.equal(review.status,200);
 assert.doesNotMatch(await(await call('/reviews')).text(),/Тестовый отзыв/);
 data=await(await call('/api/admin')).json();const pending=data.reviews.find(r=>r.text==='Тестовый отзыв');assert.ok(pending);assert.equal((await call('/api/admin',{action:'save',kind:'review',id:pending.id,payload:{...pending,published:true}})).status,200);
 assert.match(await(await call('/reviews')).text(),/Тестовый отзыв/);
 const form=new FormData();form.append('file',new Blob(['not an image'],{type:'image/jpeg'}),'bad.jpg');const invalidUpload=await fetch(origin+'/api/media',{method:'POST',headers:{Cookie:cookie,Origin:origin},body:form});assert.equal(invalidUpload.status,503);
 const image=await readFile('public/images/showroom/makeup-room.webp');const goodForm=new FormData();goodForm.append('file',new Blob([image],{type:'image/webp'}),'room.webp');const uploaded=await fetch(origin+'/api/media',{method:'POST',headers:{Cookie:cookie,Origin:origin},body:goodForm});assert.equal(uploaded.status,200);const mediaUrl=(await uploaded.json()).url;assert.equal((await call(mediaUrl)).headers.get('content-type'),'image/webp');
 const bulkDb=new DatabaseSync(path.join(dir,'site.sqlite'));bulkDb.exec('PRAGMA busy_timeout=5000');const insert=bulkDb.prepare('INSERT INTO leads(id,kind,name,phone,payload,status,created_at,notification) VALUES(?,?,?,?,?,?,?,?)');for(let i=0;i<150;i++)insert.run('bulk-'+i,'fitting',i===149?'=HYPERLINK("test")':'Тест массовой выгрузки '+i,'+79001234567',JSON.stringify({context:'bulk export',comment:'bulk'}),'Новая',new Date().toISOString(),'Не подключены');bulkDb.close();
 const page=await(await call('/api/admin?offset=100&q=bulk')).json();assert.equal(page.leadTotal,150);assert.equal(page.leads.length,50);
 const russianSearch=await(await call('/api/admin?q='+encodeURIComponent('тест массовой выгрузки'))).json();assert.equal(russianSearch.leadTotal,149);
 const exported=await call('/api/admin/export');assert.equal(exported.status,200);assert.match(exported.headers.get('content-disposition'),/attachment/);const csv=await exported.text();assert.ok(csv.includes('Тест массовой выгрузки 0'));assert.ok(csv.includes('Тест массовой выгрузки 148'));assert.ok(csv.includes('"\'=HYPERLINK'));
 assert.equal((await call('/api/admin',{action:'backup'})).status,200);
 login=await call('/api/admin',{action:'login',key:contentKey});cookie=login.headers.get('set-cookie').split(';')[0];data=await(await call('/api/admin')).json();assert.equal(data.role,'content');assert.deepEqual(data.leads,[]);assert.equal((await call('/api/admin/export')).status,403);
 assert.equal((await call('/api/admin',{action:'save',kind:'settings',id:'settings',payload:settings})).status,403);assert.equal((await call('/api/admin',{action:'backup'})).status,403);assert.equal((await call('/api/admin',{action:'save',kind:'product',id:'settings',payload:{...product,id:'settings'}})).status,400);
 await stop();await start();
 login=await call('/api/admin',{action:'login',key:adminKey});cookie=login.headers.get('set-cookie').split(';')[0];data=await(await call('/api/admin')).json();assert.equal(data.settings.intro,settings.intro);const persistedLeads=await(await call('/api/admin?q='+encodeURIComponent('Проверка движка'))).json();assert.equal(persistedLeads.leads.find(l=>l.id===leadId).status,'Подтверждена');assert.ok(data.products.find(p=>p.id===product.id));assert.equal((await call(mediaUrl)).status,200);
 console.log('Production integration checks passed: real SQLite persistence/restart, admin and editor roles, Origin checks, product archive/restore, CMS text/pages/SEO, escaped content, lead CRM, review moderation, verified uploads, private backups and indexing.');
}finally{await stop();await rm(dir,{recursive:true,force:true});}
