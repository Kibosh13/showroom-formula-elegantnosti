import {env} from 'cloudflare:workers';
export function siteSeo() {
  const config=env as unknown as Record<string,string|undefined>;
  const configured=config.SITE_URL?.replace(/\/$/,'');
  const origin=configured&&/^https:\/\//.test(configured)?configured:'https://formula-elegantnosti-moscow.nikpav2713.chatgpt.site';
  // Preview stays closed; enable only after the real content and domain are approved.
  return {origin,indexing:!!configured&&config.SITE_INDEXING==='enabled'};
}
