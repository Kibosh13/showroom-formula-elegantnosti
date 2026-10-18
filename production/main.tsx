import React from 'react';
import {hydrateRoot} from 'react-dom/client';
import Storefront from '../app/storefront';
import {currentPath} from '../app/client-mode';
import '../app/globals.css';
const data=JSON.parse(document.getElementById('site-data')!.textContent!);
hydrateRoot(document.getElementById('root')!,<Storefront initialPath={currentPath()} {...data}/>);
