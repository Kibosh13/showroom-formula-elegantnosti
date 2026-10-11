import { defineConfig } from 'vite';
import path from 'node:path';

const project = path.resolve(import.meta.dirname, '..');
export default defineConfig({
  root: path.join(project, 'demo'),
  base: process.env.DEMO_BASE_PATH || '/showroom-formula-elegantnosti/',
  publicDir: path.join(project, 'public'),
  resolve: { alias: [{find:'./admin',replacement:path.join(project,'demo/admin-stub.tsx')}] },
  define: {
    __FE_STATIC_DEMO__: 'true',
    __FE_BASE_PATH__: JSON.stringify(process.env.DEMO_BASE_PATH || '/showroom-formula-elegantnosti/'),
  },
  build: { outDir:path.join(project,'dist-demo'),emptyOutDir:true },
});
