// These constants are defined only by the static demo build, never by the engine.
declare const __FE_STATIC_DEMO__: boolean;
declare const __FE_BASE_PATH__: string;
export const staticDemo = typeof __FE_STATIC_DEMO__ !== 'undefined' && __FE_STATIC_DEMO__;
const base = typeof __FE_BASE_PATH__ !== 'undefined' ? __FE_BASE_PATH__.replace(/\/$/, '') : '';
export function assetHref(url: string) { const asset=['/images/hero.webp','/images/hero-editorial-v2.webp'].includes(url)?'/images/hero-classic-v3.webp':url; return asset.startsWith('/') ? base + asset : asset; }
export function siteHref(url: string) {
  if (!url.startsWith('/')) return url;
  if (!staticDemo) return url;
  const [path, query] = url.split('?');
  return base + (path.endsWith('/') ? path : path + '/') + (query ? '?' + query : '');
}
export function currentPath() {
  let path = location.pathname;
  if (base && path.startsWith(base + '/')) path = path.slice(base.length);
  return (path.replace(/\/$/, '') || '/') + location.search;
}
