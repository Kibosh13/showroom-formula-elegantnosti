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
   let destination=config.TELEGRAM_CHAT_ID;
   for(let attempt=0;attempt<2;attempt++){
    const response=await request(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:destination,text:message}),signal:AbortSignal.timeout(5000)});
    const result=await response.json() as {ok?:boolean;error_code?:number;parameters?:{migrate_to_chat_id?:number}};
    if(response.ok&&result.ok===true){config.TELEGRAM_CHAT_ID=destination;states.push('Telegram отправлен');break;}
    const migrated=result.parameters?.migrate_to_chat_id;
    // Telegram supplies the replacement ID when a group becomes a supergroup.
    // Follow only that authenticated API response, once; never loop on errors.
    if(attempt===0&&response.status===400&&result.error_code===400&&typeof migrated==='number'&&Number.isSafeInteger(migrated)&&migrated<0&&String(migrated)!==String(destination)){destination=String(migrated);continue;}
    states.push('Ошибка Telegram');break;
   }
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
