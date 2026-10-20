import { env } from 'cloudflare:workers';
import {db,loadStore,saveEntity} from '../../store';
import {normalizePhone,sanitizeAttribution} from '../../popup-policy';
import {sendLeadNotifications} from '../../notifications';
export async function POST(req:Request){
 try {
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Недопустимый источник запроса'},{status:403});
  const b:any=await req.json();
  if(b.website)return Response.json({error:'Не удалось отправить заявку'},{status:400});
  const kinds=['fitting','reserve','certificate','callback','review','discount'];if(!kinds.includes(b.kind))return Response.json({error:'Некорректная заявка'},{status:400});
  const discount=b.kind==='discount';
  const rawPhone=String(b.phone||'').trim(),phone=normalizePhone(rawPhone)||rawPhone;
  const name=discount?'Без имени':String(b.name||'').trim();
  if((!discount&&(name.length<2||name.length>100))||(discount&&!normalizePhone(rawPhone))||phone.replace(/\D/g,'').length<10||phone.replace(/\D/g,'').length>15||phone.length>40||b.consent!==true)return Response.json({error:discount?'Укажите полный номер телефона.':'Укажите имя, корректный телефон и подтвердите согласие.'},{status:400});
  const recent=await db().prepare('SELECT count(*) as n FROM leads WHERE phone=? AND created_at>?').bind(phone,new Date(Date.now()-3600000).toISOString()).first<{n:number}>();
  if((recent?.n||0)>=5)return Response.json({error:'Слишком много заявок. Свяжитесь с нами по телефону.'},{status:429});
  if(b.date){const now=new Date(Date.now()+10800000).toISOString().slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||b.date<now)return Response.json({error:'Выберите будущую дату'},{status:400});}
  if(b.kind==='certificate'&&(!Number.isInteger(Number(b.amount))||Number(b.amount)<1000||Number(b.amount)>200000))return Response.json({error:'Укажите номинал от 1 000 до 200 000 ₽'},{status:400});
  const {settings,products}=await loadStore();
  if(b.time&&!settings.bookingTimes.includes(String(b.time)))return Response.json({error:'Выберите доступное время.'},{status:400});
  if(discount&&(!settings.popupEnabled||(settings.popupExpires&&Date.now()>new Date(settings.popupExpires+'T23:59:59+03:00').getTime())))return Response.json({error:'Предложение больше не действует.'},{status:400});
  let promo=null;if(b.promo){promo=settings.promos.find(p=>p.active&&p.code.toUpperCase()===String(b.promo).trim().toUpperCase());if(!promo)return Response.json({error:'Промокод не найден или больше не действует'},{status:400});}
  if(b.productId){const product=products.find(p=>p.id===b.productId&&p.published);if(!product)return Response.json({error:'Товар больше не доступен'},{status:400});if(b.size&&!product.sizes.includes(b.size))return Response.json({error:'Выберите доступный размер'},{status:400});}
  const payload={...sanitizeAttribution({...b,source:discount?'popup_discount':b.source}),context:discount?settings.popupOffer:String(b.context||'').slice(0,500),productId:String(b.productId||'').slice(0,100),size:String(b.size||'').slice(0,20),color:String(b.color||'').slice(0,40),date:b.date||'',time:b.time||'',channel:String(b.channel||'Звонок').slice(0,40),comment:String(b.comment||'').slice(0,2000),email:String(b.email||'').slice(0,200),amount:Number(b.amount)||0,promo:promo?{code:promo.code,percent:promo.percent}:null,consentAt:new Date().toISOString(),consentVersion:discount?'popup-discount-1':'draft-1',marketingConsent:false};
  const id=crypto.randomUUID();
  await db().prepare('INSERT INTO leads(id,kind,name,phone,payload,status,created_at,notification) VALUES(?,?,?,?,?,?,?,?)').bind(id,b.kind,name,phone,JSON.stringify(payload),'Новая',new Date().toISOString(),'Не подключены').run();
  if(b.kind==='review')await saveEntity(id,'review',{name,rating:Math.min(5,Math.max(1,Number(b.rating)||5)),text:String(b.comment||'').slice(0,2000),published:false});
  const notification=await sendLeadNotifications(env as any,{id,kind:b.kind,name,phone,payload});
  await db().prepare('UPDATE leads SET notification=? WHERE id=?').bind(notification,id).run();
  return Response.json({ok:true,id,reference:id.slice(0,8).toUpperCase()});
 } catch {return Response.json({error:'Заявка не отправлена. Попробуйте ещё раз или позвоните нам.'},{status:503});}
}
