import { build } from 'vite';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const project = path.resolve(import.meta.dirname, '..');
const configFile = path.join(project,'demo/vite.config.ts');
const output = path.join(project,'dist-demo');
const renderer = path.join(project,'.demo-render');
await build({configFile});
await build({configFile,publicDir:false,build:{ssr:path.join(project,'demo/render.tsx'),outDir:renderer,emptyOutDir:true,rollupOptions:{output:{entryFileNames:'render.mjs'}}}});
const {routes,render} = await import(pathToFileURL(path.join(renderer,'render.mjs')).href);
const template = await readFile(path.join(output,'index.html'),'utf8');
for (const route of routes) {
  const directory = path.join(output,route.slice(1));
  await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,'index.html'),template.replace('<div id="root"></div>',`<div id="root">${render(route)}</div>`));
}
await writeFile(path.join(output,'404.html'),template.replace('<div id="root"></div>',`<div id="root">${render('/not-found')}</div>`));
await writeFile(path.join(output,'.nojekyll'),'');
await writeFile(path.join(output,'robots.txt'),'User-agent: *\nDisallow: /\n');
await rm(renderer,{recursive:true,force:true});
console.log(`Static demo: ${routes.length} pages; forms and CMS disabled; noindex on every page.`);
