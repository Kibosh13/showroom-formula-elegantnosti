export type PopupConfig = {
  popupEnabled:boolean; popupHeading:string; popupOffer:string; popupText:string;
  popupCta:string; popupImage:string; popupExpires:string; popupDelaySeconds:number;
  popupCloseDays:number; popupSuccessDays:number;
};
export const defaultPopup:PopupConfig = {
  popupEnabled:true,
  popupHeading:'Приятно познакомиться',
  popupOffer:'Получите скидку на первый визит в «Формулу Элегантности»',
  popupText:'Оставьте номер телефона — мы отправим вам персональную скидку и расскажем, как ею воспользоваться.',
  popupCta:'Получить скидку', popupImage:'/images/hero-classic-v3.webp',
  popupExpires:'', popupDelaySeconds:20, popupCloseDays:7, popupSuccessDays:30,
};
export const popupKeys = {visit:'fe_popup_visit_v1',shown:'fe_popup_shown_v1',cooldown:'fe_popup_cooldown_v1'};
export type PopupOutcome = {outcome:'closed'|'converted';at:number};
export function popupDue(config:PopupConfig,now:number,loadedAt:number,shown:boolean,outcome:PopupOutcome|null,blocked:boolean) {
  if(!config.popupEnabled||shown||blocked||now-loadedAt<Math.max(20,config.popupDelaySeconds)*1000)return false;
  if(config.popupExpires&&now>new Date(config.popupExpires+'T23:59:59+03:00').getTime())return false;
  if(outcome&&now-outcome.at<(outcome.outcome==='converted'?config.popupSuccessDays:config.popupCloseDays)*86400000)return false;
  return true;
}
export function normalizePhone(value:string) {
  let digits=value.replace(/\D/g,'');
  if(digits.length===10)digits='7'+digits;
  if(digits.length!==11||!['7','8'].includes(digits[0])||/^(\d)\1{9}$/.test(digits.slice(1)))return null;
  return '+7'+digits.slice(1);
}
export function maskPhone(value:string) {
  let digits=value.replace(/\D/g,'');
  if(digits[0]==='7'||digits[0]==='8')digits=digits.slice(1);
  digits=digits.slice(0,10);
  if(!digits)return '';
  return '+7 ('+digits.slice(0,3)+(digits.length>=3?') ':'')+digits.slice(3,6)+(digits.length>6?'-'+digits.slice(6,8):'')+(digits.length>8?'-'+digits.slice(8):'');
}
export const utmKeys=['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
export function sanitizeAttribution(value:any) {
  const utm:Record<string,string>={};
  for(const key of utmKeys)if(typeof value?.utm?.[key]==='string')utm[key]=value.utm[key].slice(0,200);
  const safeUrl=(input:any)=>{try{const url=new URL(String(input));if(!['http:','https:'].includes(url.protocol))return '';url.username='';url.password='';url.hash='';return url.href.slice(0,2000);}catch{return '';}};
  return {source:value?.source==='popup_discount'?'popup_discount':'website',pageUrl:safeUrl(value?.pageUrl),referrer:safeUrl(value?.referrer),utm};
}
