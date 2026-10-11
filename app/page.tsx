import {loadStore} from './store';
import Storefront from './storefront';
export const dynamic='force-dynamic';
export default async function Page(){const store=await loadStore();return <Storefront initialPath="/" products={store.products.filter(p=>p.published)} looks={store.looks.filter(l=>l.published)} settings={{...store.settings,promos:[]}} reviews={store.reviews}/>}
