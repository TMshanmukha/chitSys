import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Globally disable mouse wheel, trackpad, and keyboard stepper functions on all number inputs across the entire application
if (typeof window !== 'undefined') {
  // 1. Prevent mouse wheel & trackpad scroll from altering number input values
  window.addEventListener(
    'wheel',
    (e) => {
      const target = e.target;
      if (target && target.tagName === 'INPUT' && target.type === 'number') {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true, passive: false }
  );

  // 2. Prevent ArrowUp & ArrowDown keys from incrementing/decrementing number inputs (manual entry only)
  window.addEventListener(
    'keydown',
    (e) => {
      const target = e.target;
      if (
        (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
        target &&
        target.tagName === 'INPUT' &&
        target.type === 'number'
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true, passive: false }
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
