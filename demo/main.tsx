import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import Storefront from '../app/storefront';
import { catalogueProducts, collectionLooks, defaultSettings } from '../app/data';
import { currentPath } from '../app/client-mode';
import '../app/globals.css';

hydrateRoot(document.getElementById('root')!, <Storefront initialPath={currentPath()} products={catalogueProducts} looks={collectionLooks} settings={{...defaultSettings,promos:[]}} reviews={[]} />);
