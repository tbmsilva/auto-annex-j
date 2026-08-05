import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global pointer-tracking for Apple-style light refraction sheen.
// Sets --mouse-x and --mouse-y (as %) on every refractive element
// so the CSS radial-gradient sheen follows the cursor precisely.
const REFRACTION_SELECTOR = [
  '.glass-panel',
  '.dropzone',
  '.btn-secondary',
  '.file-chip',
  '.table-container',
  '.dropdown-menu',
  '.dropdown-item',
  '.btn-primary',
].join(',');

function applyRefractionTracking() {
  document.addEventListener('pointermove', (e: PointerEvent) => {
    const elements = document.querySelectorAll<HTMLElement>(REFRACTION_SELECTOR);
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--mouse-x', `${x.toFixed(1)}%`);
      el.style.setProperty('--mouse-y', `${y.toFixed(1)}%`);
    });
  }, { passive: true });
}

applyRefractionTracking();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
