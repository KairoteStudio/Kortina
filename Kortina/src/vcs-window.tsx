import React from 'react';
import ReactDOM from 'react-dom/client';
import { VcsWindow } from './components/Vcs/VcsWindow';
import './styles.css';
import './App.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>
    <VcsWindow />
  </React.StrictMode>);