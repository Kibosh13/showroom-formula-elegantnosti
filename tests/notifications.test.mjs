import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:['app/notifications.ts'],write:false,bundle:true,platform:'node',format:'esm'});
const {notificationConfiguration,sendLeadNotifications,leadMessage}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].contents).toString('base64'));
const config={TELEGRAM_BOT_TOKEN:'test-only-token',TELEGRAM_CHAT_ID:'test-only-chat',RESEND_API_KEY:'test-only-key',NOTIFICATION_EMAIL:'inbox@example.invalid',NOTIFICATION_FROM:'site@example.invalid'};
assert.deepEqual(notificationConfiguration({}),{telegram:false,email:false});
assert.deepEqual(notificationConfiguration({TELEGRAM_BOT_TOKEN:'partial'}),{telegram:false,email:false});
for(const kind of ['discount','fitting','certificate']){
 const lead={id:'12345678-test',kind,name:'Тест уведомления',phone:'+79001234567',payload:{context:'Тестовая заявка',amount:kind==='certificate'?15000:0,email:'client@example.invalid',channel:'MAX',source:kind==='discount'?'popup_discount':'website'}};
 const calls=[];
 const request=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return Response.json(url.includes('telegram')?{ok:true}:{id:'test-email'});};
 assert.equal(await sendLeadNotifications(config,lead,request),'Telegram отправлен; Email отправлен');
 assert.equal(calls.length,2);assert.equal(calls[0].body.chat_id,config.TELEGRAM_CHAT_ID);
 assert.match(calls[0].body.text,/Тест уведомления/);assert.match(calls[0].body.text,/Связаться с клиентом: MAX/);
 if(kind==='certificate')assert.match(calls[0].body.text,/Номинал сертификата: 15\s000 ₽/);
 if(kind==='discount')assert.match(calls[0].body.text,/Скидка из pop-up/);
 let attempted=false;
 assert.equal(await sendLeadNotifications({},lead,async()=>{attempted=true;throw Error();}),'Не подключены');assert.equal(attempted,false);
 assert.equal(await sendLeadNotifications(config,lead,async()=>{throw Error('network');}),'Ошибка Telegram; Ошибка Email');
 assert.equal(await sendLeadNotifications(config,lead,async()=>Response.json({ok:false},{status:200})),'Ошибка Telegram; Email отправлен');
 assert.equal(await sendLeadNotifications(config,lead,async()=>Response.json({ok:false},{status:403})),'Ошибка Telegram; Ошибка Email');
 assert.ok(leadMessage({...lead,payload:{comment:'Я'.repeat(8000)}}).length<=4000);
}
console.log('Notification checks passed: popup, booking and certificate payloads, recipient routing, missing credentials and provider failures. No external messages sent.');
