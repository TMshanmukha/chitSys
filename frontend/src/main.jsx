import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Globally disable mouse wheel & trackpad scroll from altering number input values anywhere in the application
if (typeof window !== 'undefined') {
  window.addEventListener(
    'wheel',
    (e) => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.tagName === 'INPUT' && activeEl.type === 'number') {
        activeEl.blur();
      }
      if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'number') {
        e.target.blur();
      }
    },
    { capture: true, passive: true }
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
