import React from 'react';
import ReactDOM from 'react-dom/client';
import PaginationView from './components/PaginationView';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <PaginationView />
  </React.StrictMode>
);
