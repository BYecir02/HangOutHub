import React from 'react';
import { createRoot } from 'react-dom/client';

import './style.css';
import App from './App';

const rootElement = document.getElementById('app');

if (!rootElement) {
  throw new Error('Missing root element');
}

const themeKey = 'hangouthub_backoffice_theme';
const storedTheme = localStorage.getItem(themeKey);
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
document.documentElement.classList.toggle('dark', initialTheme === 'dark');

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
