'use client';
import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,Check} from 'lucide-react';
import type {Settings} from './data';
import {Dialog} from './dialog';
import {assetHref,siteHref,staticDemo} from './client-mode';
import {attribution,track} from './analytics';
import {maskPhone,normalizePhone,popupDue,popupKeys,type PopupOutcome} from './popup-policy';

export function DiscountPopup({settings,blocked,onCatalog,onBook}:{settings:Settings;blocked:boolean;onCatalog:()=>void;onBook:()=>void}) {
  const [open,setOpen]=useState(false),[phone,setPhone]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(false);
  const phoneStarted=useRef(false),website=useRef<HTMLInputElement>(null);
  const options=useRef({settings,blocked});options.current={settings,blocked};
  useEffect(()=>{
    let timer:ReturnType<typeof setInterval>|undefined,loadedAt=0,shown=false;
    const start=()=>{
      loadedAt=Date.now();
      try{const saved=Number(sessionStorage.getItem(popupKeys.visit));if(saved>0&&saved<=loadedAt)loadedAt=saved;else sessionStorage.setItem(popupKeys.visit,String(loadedAt));shown=sessionStorage.getItem(popupKeys.shown)==='yes';}catch{}
      attribution();
      timer=setInterval(()=>{
        const {settings,blocked}=options.current;
        let outcome:PopupOutcome|null=null;
        try{outcome=JSON.parse(localStorage.getItem(popupKeys.cooldown)||'null');shown=shown||sessionStorage.getItem(popupKeys.shown)==='yes';}catch{}
        const focused=document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')||false;
        const anotherModal=!!document.querySelector('[role="dialog"],[aria-modal="true"],.filter-overlay');
        if(popupDue(settings,Date.now(),loadedAt,shown,outcome,blocked||focused||anotherModal||document.visibilityState!=='visible')){
          shown=true;try{sessionStorage.setItem(popupKeys.shown,'yes');}catch{}
          clearInterval(timer);setOpen(true);track('discount_popup_view','popup_discount');
        }
      },250);
    };
    if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
    return()=>{clearInterval(timer);window.removeEventListener('load',start);};
  },[]);
  useEffect(()=>{if(!open)return;const saved=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=saved;};},[open]);
  function remember(outcome:PopupOutcome['outcome']){try{localStorage.setItem(popupKeys.cooldown,JSON.stringify({outcome,at:Date.now()}));}catch{}}
  function close(){if(!success){remember('closed');track('discount_popup_close','popup_discount');}setOpen(false);}
  async function submit(e:React.FormEvent){
    e.preventDefault();if(staticDemo||busy)return;
    const normalized=normalizePhone(phone);
    if(!normalized){setError('Введите полный номер телефона: +7 и 10 цифр.');track('discount_popup_error','popup_discount');return;}
    setBusy(true);setError('');
    try{
      const r=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'discount',context:settings.popupOffer,phone:normalized,consent:true,website:website.current?.value||'',...attribution('popup_discount')})});
      if(!r.ok)throw Error();
      remember('converted');setSuccess(true);track('discount_popup_submit','popup_discount');
    }catch{setError('Не удалось отправить. Попробуйте ещё раз.');track('discount_popup_error','popup_discount');}
    finally{setBusy(false);}
  }
  if(!open)return null;
  return <Dialog title={success?'Ваша скидка за вами':settings.popupHeading} className="discount-dialog" onClose={close}>
    <div className="discount-visual"><img src={assetHref(settings.popupImage)} alt="Персональный стиль в Формуле Элегантности"/></div>
    <div className="discount-content">{success?<div className="discount-success" role="status">
      <Check size={28}/><span className="eyebrow">ПЕРСОНАЛЬНОЕ ПРЕДЛОЖЕНИЕ</span><h2>Ваша скидка за вами</h2><p>Спасибо! Мы свяжемся с вами по указанному номеру. А пока можно выбрать вещи и готовые образы, которые вы захотите примерить.</p>
      <button className="button full-width" onClick={()=>{track('discount_popup_catalog','popup_discount');setOpen(false);onCatalog();}}>Смотреть каталог <ArrowRight size={17}/></button>
      <button className="text-link" onClick={()=>{track('discount_popup_fitting','popup_discount');setOpen(false);onBook();}}>Записаться к стилисту <ArrowRight size={17}/></button>
    </div>:<>
      <span className="eyebrow">{settings.popupHeading}</span><h2>{settings.popupOffer}</h2><p>{settings.popupText}</p>
      <form onSubmit={submit} noValidate>
        <label className="field" htmlFor="discount-phone">Ваш телефон<input id="discount-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" disabled={staticDemo} value={phone} placeholder="+7 (___) ___-__-__" aria-invalid={!!error} aria-describedby={error?'discount-error':undefined} onChange={e=>{setPhone(maskPhone(e.target.value));setError('');if(!phoneStarted.current){phoneStarted.current=true;track('discount_popup_phone_start','popup_discount');}}}/></label>
        <label className="honeypot" aria-hidden="true">Ваш сайт<input ref={website} name="website" tabIndex={-1} autoComplete="off"/></label>
        {error&&<p id="discount-error" className="form-error" role="alert">{error}</p>}
        <button className="button full-width" disabled={busy||staticDemo}>{busy?'Отправляем…':settings.popupCta}<ArrowRight size={17}/></button>
        {staticDemo?<p className="discount-demo-note">В демоверсии отправка телефона отключена. Предложение можно уточнить у стилиста.</p>:<p className="discount-consent">Нажимая кнопку, вы соглашаетесь на <a href={siteHref('/privacy')} target="_blank" rel="noreferrer">обработку персональных данных</a>.</p>}
      </form>
      {staticDemo&&<a className="text-link" href={settings.whatsapp} target="_blank" rel="noreferrer">Связаться со стилистом <ArrowRight size={16}/></a>}
      <button className="discount-skip" onClick={close}>Продолжить без скидки</button>
    </>}</div>
  </Dialog>;
}
