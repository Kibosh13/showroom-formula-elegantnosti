import { env } from 'cloudflare:workers';
const encoder=new TextEncoder();
const getPassword=()=> (env as any).ADMIN_PASSWORD as string | undefined;
async function signature(s:string){const key=await crypto.subtle.importKey('raw',encoder.encode(getPassword()||''),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function adminRole(req:Request){if(!getPassword())return null;const cookie=req.headers.get('cookie')?.match(/(?:^|;\s*)fe_admin=([^;]+)/)?.[1];if(!cookie)return null;const [expiry,role,sig]=cookie.split('.');if(!expiry||!sig||Number(expiry)<Date.now()||!['admin','content'].includes(role))return null;return sig===await signature(expiry+'.'+role)?role:null;}
export async function isAdmin(req:Request){return !!await adminRole(req);}
export async function login(key:string){const pass=getPassword(),content=(env as any).CONTENT_PASSWORD;let role='';if(pass&&key===pass)role='admin';else if(content&&key===content)role='content';else return null;const expiry=String(Date.now()+8*60*60*1000);return `${expiry}.${role}.${await signature(expiry+'.'+role)}`;}
export const sameOrigin=(req:Request)=>!req.headers.get('origin')||req.headers.get('origin')===new URL(req.url).origin;
