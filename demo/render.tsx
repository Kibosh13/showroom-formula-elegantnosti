import React from 'react';
import { renderToString } from 'react-dom/server';
import Storefront from '../app/storefront';
import { catalogueProducts, collectionLooks, defaultSettings } from '../app/data';

export const routes = ['/', '/catalog', '/looks', '/capsules', '/about', '/services', '/prices', '/gallery', '/contacts', '/booking', '/favorites', '/certificates', '/reviews', '/privacy', '/admin', ...catalogueProducts.map(p=>'/product/'+p.id), ...collectionLooks.map(l=>'/look/'+l.id)];
export function render(path:string) {
  return renderToString(<Storefront initialPath={path} products={catalogueProducts} looks={collectionLooks} settings={{...defaultSettings,promos:[]}} reviews={[]} />);
}
