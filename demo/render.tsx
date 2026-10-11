import React from 'react';
import { renderToString } from 'react-dom/server';
import Storefront from '../app/storefront';
import { demoProducts, demoLooks, defaultSettings } from '../app/data';

export const routes = ['/', '/catalog', '/looks', '/capsules', '/about', '/services', '/prices', '/gallery', '/contacts', '/booking', '/favorites', '/certificates', '/reviews', '/privacy', '/admin', ...demoProducts.map(p=>'/product/'+p.id), ...demoLooks.map(l=>'/look/'+l.id)];
export function render(path:string) {
  return renderToString(<Storefront initialPath={path} products={demoProducts} looks={demoLooks} settings={{...defaultSettings,promos:[]}} reviews={[]} />);
}
