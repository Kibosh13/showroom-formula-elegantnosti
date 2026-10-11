import {siteSeo} from './site-seo';
export const dynamic='force-dynamic';
export default function robots() {
  const {origin,indexing}=siteSeo();
  return indexing?{rules:{userAgent:'*',allow:'/',disallow:['/admin','/api/']},sitemap:origin+'/sitemap.xml'}:{rules:{userAgent:'*',disallow:'/'}};
}
