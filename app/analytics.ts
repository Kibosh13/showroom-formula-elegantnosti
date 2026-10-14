import {staticDemo} from './client-mode';
import {sanitizeAttribution,utmKeys} from './popup-policy';
export function attribution(source='website') {
  const current:Record<string,string>={};
  for(const key of utmKeys){const value=new URLSearchParams(location.search).get(key);if(value)current[key]=value;}
  let saved:any={};
  try{saved=JSON.parse(sessionStorage.getItem('fe_attribution_v1')||'{}');if(Object.keys(current).length){saved={utm:current,referrer:document.referrer};sessionStorage.setItem('fe_attribution_v1',JSON.stringify(saved));}else if(!Object.keys(saved).length){saved={utm:{},referrer:document.referrer};sessionStorage.setItem('fe_attribution_v1',JSON.stringify(saved));}}catch{}
  return sanitizeAttribution({...saved,source,pageUrl:location.href});
}
export function track(name:string,source='website') {
  if(staticDemo||!name||typeof window==='undefined')return;
  try{if(localStorage.getItem('fe_analytics')!=='yes')return;}catch{return;}
  const metadata=attribution(source);
  (window as any).dataLayer=(window as any).dataLayer||[];
  (window as any).dataLayer.push({event:name,...metadata});
  fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,...metadata}),keepalive:true}).catch(()=>{});
}
