'use client';
import React,{useEffect,useRef} from 'react';
import {X} from 'lucide-react';
export function Dialog({title,onClose,children,wide=false,className=''}:{title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean;className?:string}) {
  const ref=useRef<HTMLDivElement>(null),close=useRef(onClose);
  close.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement;
    const el=ref.current;
    // Focus the close button without moving the page or opening the mobile keyboard.
    el?.querySelector<HTMLElement>('button,a,input,select,textarea')?.focus({preventScroll:true});
    const trap=(e:KeyboardEvent)=>{
      if(e.key==='Escape')close.current();
      if(e.key==='Tab'&&el){
        const controls=Array.from(el.querySelectorAll<HTMLElement>('button,a,input,select,textarea,[tabindex="0"]')).filter(n=>!n.hasAttribute('disabled')&&n.offsetParent!==null);
        if(!controls.length)return;
        const first=controls[0],last=controls[controls.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',trap);
    return()=>{document.removeEventListener('keydown',trap);previous?.focus({preventScroll:true});};
  },[]);
  return <div className="modal-overlay" onClick={onClose}><div ref={ref} className={'dialog '+(wide?'wide ':'')+className} role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}><button className="dialog-close icon-button" aria-label="Закрыть" onClick={onClose}><X/></button>{children}</div></div>;
}
