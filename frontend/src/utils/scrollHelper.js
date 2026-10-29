/**
 * Utility for smooth, animated automatic window movement across all pages and components.
 * Supports element IDs, DOM elements, or pixel coordinates with header offset protection.
 */
export function smoothScrollTo(target, options = {}) {
  const { offset = 24, behavior = 'smooth', delay = 80 } = options;

  setTimeout(() => {
    try {
      if (typeof target === 'number') {
        window.scrollTo({ top: Math.max(0, target), behavior });
        return;
      }

      let el = null;
      if (typeof target === 'string') {
        const id = target.startsWith('#') ? target.slice(1) : target;
        el = document.getElementById(id);
      } else if (target && target.nodeType === Node.ELEMENT_NODE) {
        el = target;
      }

      if (el) {
        const rect = el.getBoundingClientRect();
        const targetY = window.pageYOffset + rect.top - offset;
        window.scrollTo({
          top: Math.max(0, targetY),
          behavior,
        });
      }
    } catch (err) {
      console.warn('smoothScrollTo notice:', err);
    }
  }, delay);
}

/**
 * Automatically scrolls the window to the very top smoothly.
 */
export function scrollToPageTop(behavior = 'smooth') {
  try {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior,
    });
    if (document.documentElement) {
      document.documentElement.scrollTo({ top: 0, left: 0, behavior });
    }
    if (document.body) {
      document.body.scrollTo({ top: 0, left: 0, behavior });
    }
  } catch (err) {
    window.scrollTo(0, 0);
  }
}
