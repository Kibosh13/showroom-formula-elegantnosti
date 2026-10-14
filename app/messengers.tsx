'use client';
import React,{useEffect,useState} from 'react';
import {Copy,Check} from 'lucide-react';
import type {Settings} from './data';
import {Dialog} from './dialog';
import {track} from './analytics';

function MessengerIcon({name}:{name:string}) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">{name==='WhatsApp'?<>
    <path fillRule="evenodd" d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 1 1-4.1 15.3l-.4-.2-3 .8.8-2.9-.3-.5A8.2 8.2 0 0 1 12 3.8Z"/>
    <path d="M8.3 6.8c-.3-.5-.5-.5-.8-.5-.5 0-1.6.8-1.6 2.3 0 1.4 1.2 3.2 2.8 4.8 1.7 1.7 3.5 2.6 5.2 2.8 1.6.2 2.7-.8 2.9-1.6.1-.5 0-.7-.3-.8l-2.1-1c-.4-.2-.6-.1-.8.2l-.9 1c-.2.2-.4.2-.7.1-1.2-.5-2.5-1.6-3.2-2.8-.2-.3-.2-.5 0-.7l.6-.8c.2-.3.3-.5.1-.9L8.3 6.8Z"/>
  </>:name==='Telegram'?<path d="M20.9 3.7 2.8 10.8c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.7 5.2c.2.6.4.8.8.8.3 0 .5-.2.7-.4l2.3-2.2 4.9 3.6c.9.5 1.5.2 1.7-.8l3-14.3c.3-1.3-.5-2-1.4-1.9Zm-3.1 3.6-8.5 7.6-.3 3.2-1-4.5 9.3-6.1c.5-.3.9-.6.5-.2Z"/>:<>
    <path fillRule="evenodd" d="M12 2C6.5 2 2 6.3 2 11.7c0 2.7 1.2 5.2 3 7L4.6 22l4-1.2c1.1.4 2.2.6 3.4.6 5.5 0 10-4.3 10-9.7S17.5 2 12 2Zm0 4.6a5.1 5.1 0 1 1 0 10.2 5.1 5.1 0 0 1 0-10.2Z"/>
  </>}</svg>;
}
export function Messenger({settings:s}:{settings:Settings}) {
  const [maxOpen,setMaxOpen]=useState(false),[copied,setCopied]=useState(false);
  useEffect(()=>{if(!maxOpen)return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;};},[maxOpen]);
  const items=[['WhatsApp',s.whatsapp],['Telegram',s.telegram],['MAX',s.max]];
  return <><div className="messengers" aria-label="Мессенджеры">{items.map(([name,url])=>url?<a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={'Связаться в '+name} title={name} onClick={()=>track('click_messenger')}><MessengerIcon name={name}/></a>:name==='MAX'?<button key={name} aria-label="Связаться в MAX по номеру телефона" title="MAX" onClick={()=>{setMaxOpen(true);track('click_messenger');}}><MessengerIcon name={name}/></button>:null)}</div>{maxOpen&&<Dialog title="Связаться в MAX" onClose={()=>setMaxOpen(false)}><span className="eyebrow">MAX</span><h2>Мы на связи</h2><p className="max-instructions">В MAX откройте поиск, введите номер и выберите «Найти по номеру».</p><a className="max-phone" href={'tel:+'+s.phone.replace(/\D/g,'')}>{s.phone}</a><button className="button full-width" onClick={async()=>{try{await navigator.clipboard.writeText('+'+s.phone.replace(/\D/g,''));setCopied(true);}catch{setCopied(false);}}}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?'Номер скопирован':'Скопировать номер'}</button><p className="small-text">Прямая ссылка на чат появится после подключения профиля шоурума.</p></Dialog>}</>;
}
