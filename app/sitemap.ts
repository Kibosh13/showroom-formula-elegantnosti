import {loadStore} from './store';
export const dynamic='force-dynamic';
export default async function sitemap(){const origin='https://formula-elegantnosti-moscow.nikpav2713.chatgpt.site';const {products,looks}=await loadStore();return ['', '/catalog','/looks','/capsules','/about','/services','/prices','/gallery','/contacts','/certificates','/reviews',...products.filter(p=>p.published&&!p.demo).map(p=>'/product/'+p.id),...looks.filter(l=>l.published).map(l=>'/look/'+l.id)].map(path=>({url:origin+path,changeFrequency:'weekly' as const,priority:path===''?1:.7}));}
