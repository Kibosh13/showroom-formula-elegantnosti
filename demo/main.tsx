import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import Storefront from '../app/storefront';
import { demoProducts, demoLooks, defaultSettings } from '../app/data';
import { currentPath } from '../app/client-mode';
import '../app/globals.css';

hydrateRoot(document.getElementById('root')!, <Storefront initialPath={currentPath()} products={demoProducts} looks={demoLooks} settings={{...defaultSettings,promos:[]}} reviews={[]} />);
