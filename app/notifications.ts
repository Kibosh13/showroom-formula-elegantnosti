type NotificationConfig = Record<string, unknown>;
type LeadNotification = {id:string;kind:string;name:string;phone:string;payload:Record<string,any>};

export function notificationConfiguration(config:NotificationConfig){
 return {telegram:!!(config.TELEGRAM_BOT_TOKEN&&config.TELEGRAM_CHAT_ID),email:!!(config.RESEND_API_KEY&&config.NOTIFICATION_EMAIL&&config.NOTIFICATION_FROM)};
}

export function leadMessage(lead:LeadNotification){
 const {payload:p}=lead;
 const kinds:Record<string,string>={discount:'Скидка из pop-up',fitting:'Запись к стилисту',certificate:'Подарочный сертификат',reserve:'Бронирование вещи',callback:'Обратный звонок',review:'Отзыв'};
 return ['Формула Элегантности',`Новая заявка: ${kinds[lead.kind]||lead.kind}`,`Номер: ${lead.id.slice(0,8).toUpperCase()}`,`Имя: ${lead.name}`,`Телефон: ${lead.phone}`,p.context,p.amount?`Номинал сертификата: ${Number(p.amount).toLocaleString('ru-RU')} ₽`:'',p.email?`Email: ${p.email}`:'',[p.date,p.time].filter(Boolean).join(' '),p.size?`Размер: ${p.size}`:'',p.color?`Цвет: ${p.color}`:'',`Связаться с клиентом: ${p.channel||'Звонок'}`,p.comment,p.promo?`Промокод: ${p.promo.code}`:'',`Источник: ${p.source||'website'}`,p.pageUrl?`Страница: ${p.pageUrl}`:''].filter(Boolean).join('\n').slice(0,4000);
}

export async function sendLeadNotifications(config:NotificationConfig,lead:LeadNotification,request:typeof fetch=fetch){
 const connected=notificationConfiguration(config),states:string[]=[],message=leadMessage(lead);
 if(connected.telegram){
  try{
   const response=await request(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:config.TELEGRAM_CHAT_ID,text:message}),signal:AbortSignal.timeout(5000)});
   const result=await response.json() as {ok?:boolean};
   states.push(response.ok&&result.ok===true?'Telegram отправлен':'Ошибка Telegram');
  }catch{states.push('Ошибка Telegram');}
 }
 if(connected.email){
  try{
   const response=await request('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:config.NOTIFICATION_FROM,to:config.NOTIFICATION_EMAIL,subject:'Новая заявка — Формула Элегантности',text:message}),signal:AbortSignal.timeout(5000)});
   states.push(response.ok?'Email отправлен':'Ошибка Email');
  }catch{states.push('Ошибка Email');}
 }
 return states.length?states.join('; '):'Не подключены';
}
