import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// This file is the bridge:
// index.html has an empty box <div id="root">
// main.jsx finds that box, and puts our whole App inside it.
// Nothing else belongs here — all pages live in App.jsx.
createRoot(document.getElementById('root')).render(<App />);
