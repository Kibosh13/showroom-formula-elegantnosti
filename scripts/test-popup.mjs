import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const directory=await mkdtemp(path.join(tmpdir(),'fe-popup-test-'));
try{
  const output=path.join(directory,'tests.mjs');
  await build({entryPoints:['tests/popup.test.ts'],outfile:output,bundle:true,platform:'node',format:'esm',alias:{'cloudflare:workers':path.resolve('tests/workers-fixture.ts')}});
  await import(pathToFileURL(output).href);
}finally{await rm(directory,{recursive:true,force:true});}
