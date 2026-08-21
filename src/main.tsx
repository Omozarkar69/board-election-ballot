import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import ElectionContinuity from './ElectionContinuity.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ElectionContinuity>
      <App />
    </ElectionContinuity>
  </React.StrictMode>
);
