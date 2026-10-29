import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { smoothScrollTo, scrollToPageTop } from '../utils/scrollHelper';

/**
 * Global ScrollToTop component:
 * Listens to location changes across all pages and guarantees automatic smooth window movement.
 * - If a hash is provided (e.g., #route-trajectory-map), smoothly scrolls to that element.
 * - Otherwise, automatically and smoothly scrolls the window to the very top.
 */
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      smoothScrollTo(hash, { offset: 30, behavior: 'smooth', delay: 100 });
    } else {
      scrollToPageTop('smooth');
    }
  }, [pathname, search, hash]);

  return null;
}
