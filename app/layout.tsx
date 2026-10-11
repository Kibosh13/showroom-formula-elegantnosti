import type { Metadata } from 'next';
import './globals.css';
import {siteSeo} from './site-seo';
export function generateMetadata():Metadata{const {origin,indexing}=siteSeo();return {metadataBase:new URL(origin),title:{default:'Формула Элегантности — пространство персонального стиля',template:'%s | Формула Элегантности'},description:'Женская классическая одежда, персональный подбор со стилистом и полный образ в шоуруме на Неглинной 8/10 в Москве.',icons:{icon:'/favicon.svg'},openGraph:{locale:'ru_RU',type:'website',siteName:'Формула Элегантности',images:['/images/hero.webp']},robots:{index:indexing,follow:indexing}};}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>}
