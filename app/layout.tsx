import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={metadataBase:new URL('https://formula-elegantnosti-moscow.nikpav2713.chatgpt.site'),title:{default:'Формула Элегантности — пространство персонального стиля',template:'%s | Формула Элегантности'},description:'Женская классическая одежда, персональный подбор со стилистом и полный образ в шоуруме на Неглинной 8/10 в Москве.',icons:{icon:'/favicon.svg'},openGraph:{locale:'ru_RU',type:'website',siteName:'Формула Элегантности',images:['/images/hero.webp']},robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>}
