import {defineConfig} from 'vite';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
export default defineConfig({root:path.join(root,'production'),base:'/',publicDir:path.join(root,'public'),define:{__FE_STATIC_DEMO__:'false',__FE_BASE_PATH__:JSON.stringify('')},build:{outDir:path.join(root,'dist-production/public'),emptyOutDir:true}});
