import type { Metadata } from 'next';
import './globals.css';
import {siteSeo} from './site-seo';
export function generateMetadata():Metadata{const {origin,indexing}=siteSeo();return {metadataBase:new URL(origin),title:{default:'Формула Элегантности — пространство персонального стиля',template:'%s | Формула Элегантности'},description:'Женская классическая одежда, персональный подбор со стилистом и полный образ в шоуруме на Неглинной 8/10 в Москве.',icons:{icon:'/favicon.svg'},openGraph:{locale:'ru_RU',type:'website',siteName:'Формула Элегантности',images:['/images/hero-classic-v3.webp']},robots:{index:indexing,follow:indexing}};}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><head><link rel="preload" href="/fonts/cormorant.ttf" as="font" type="font/ttf" crossOrigin="anonymous"/><link rel="preload" href="/fonts/montserrat.ttf" as="font" type="font/ttf" crossOrigin="anonymous"/></head><body>{children}</body></html>}
