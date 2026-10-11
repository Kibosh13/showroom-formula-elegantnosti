import { env } from 'cloudflare:workers';
import {db,loadStore,saveEntity} from '../../store';
export async function POST(req:Request){
 try {
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Недопустимый источник запроса'},{status:403});
  const b:any=await req.json();
  if(b.website)return Response.json({error:'Не удалось отправить заявку'},{status:400});
  const name=String(b.name||'').trim(),phone=String(b.phone||'').trim();
  if(name.length<2||name.length>100||phone.replace(/\D/g,'').length<10||phone.length>40||b.consent!==true)return Response.json({error:'Укажите имя, корректный телефон и подтвердите согласие.'},{status:400});
  const kinds=['fitting','reserve','certificate','callback','review'];if(!kinds.includes(b.kind))return Response.json({error:'Некорректная заявка'},{status:400});
  const recent=await db().prepare('SELECT count(*) as n FROM leads WHERE phone=? AND created_at>?').bind(phone,new Date(Date.now()-3600000).toISOString()).first<{n:number}>();
  if((recent?.n||0)>=5)return Response.json({error:'Слишком много заявок. Свяжитесь с нами по телефону.'},{status:429});
  if(b.date){const now=new Date(Date.now()+10800000).toISOString().slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||b.date<now)return Response.json({error:'Выберите будущую дату'},{status:400});}
  if(b.time&&!/^(11|12|13|14|15|16|17|18|19):00$/.test(b.time))return Response.json({error:'Выберите время в часы работы'},{status:400});
  if(b.kind==='certificate'&&(!Number.isInteger(Number(b.amount))||Number(b.amount)<1000||Number(b.amount)>200000))return Response.json({error:'Укажите номинал от 1 000 до 200 000 ₽'},{status:400});
  const {settings,products}=await loadStore();
  let promo=null;if(b.promo){promo=settings.promos.find(p=>p.active&&p.code.toUpperCase()===String(b.promo).trim().toUpperCase());if(!promo)return Response.json({error:'Промокод не найден или больше не действует'},{status:400});}
  if(b.productId){const product=products.find(p=>p.id===b.productId&&p.published);if(!product)return Response.json({error:'Товар больше не доступен'},{status:400});if(b.size&&!product.sizes.includes(b.size))return Response.json({error:'Выберите доступный размер'},{status:400});}
  const payload={context:String(b.context||'').slice(0,500),productId:String(b.productId||'').slice(0,100),size:String(b.size||'').slice(0,20),color:String(b.color||'').slice(0,40),date:b.date||'',time:b.time||'',channel:String(b.channel||'Звонок').slice(0,40),comment:String(b.comment||'').slice(0,2000),email:String(b.email||'').slice(0,200),amount:Number(b.amount)||0,promo:promo?{code:promo.code,percent:promo.percent}:null,consentAt:new Date().toISOString(),consentVersion:'draft-1'};
  const id=crypto.randomUUID();
  await db().prepare('INSERT INTO leads(id,kind,name,phone,payload,status,created_at,notification) VALUES(?,?,?,?,?,?,?,?)').bind(id,b.kind,name,phone,JSON.stringify(payload),'Новая',new Date().toISOString(),'Не подключены').run();
  if(b.kind==='review')await saveEntity(id,'review',{name,rating:Math.min(5,Math.max(1,Number(b.rating)||5)),text:String(b.comment||'').slice(0,2000),published:false});
  const e=env as any;const states:string[]=[];const message=`Формула Элегантности\nНовая заявка: ${b.kind}\n${name}\n${phone}\n${payload.context}\n${payload.date} ${payload.time}\nСвязь: ${payload.channel}\n${payload.comment}`;
  if(e.TELEGRAM_BOT_TOKEN&&e.TELEGRAM_CHAT_ID){try{const r=await fetch(`https://api.telegram.org/bot${e.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:e.TELEGRAM_CHAT_ID,text:message}),signal:AbortSignal.timeout(5000)});states.push(r.ok?'Telegram отправлен':'Ошибка Telegram');}catch{states.push('Ошибка Telegram');}}
  if(e.RESEND_API_KEY&&e.NOTIFICATION_EMAIL&&e.NOTIFICATION_FROM){try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${e.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:e.NOTIFICATION_FROM,to:e.NOTIFICATION_EMAIL,subject:'Новая заявка — Формула Элегантности',text:message}),signal:AbortSignal.timeout(5000)});states.push(r.ok?'Email отправлен':'Ошибка Email');}catch{states.push('Ошибка Email');}}
  if(states.length)await db().prepare('UPDATE leads SET notification=? WHERE id=?').bind(states.join('; '),id).run();
  return Response.json({ok:true,id,reference:id.slice(0,8).toUpperCase()});
 } catch {return Response.json({error:'Заявка не отправлена. Попробуйте ещё раз или позвоните нам.'},{status:503});}
}
