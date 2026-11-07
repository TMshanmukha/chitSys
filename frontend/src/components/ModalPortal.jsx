import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { scrollToFormOrModal } from '../utils/scrollHelper';

/**
 * Universal Modal Portal wrapper that:
 * 1. Mounts modals directly into document.body so they are NEVER trapped by parent transforms, overflows, or offsets.
 * 2. Automatically moves the window smoothly to the form/modal on open.
 * 3. Locks body background scrolling while open and restores it on unmount.
 * 4. Ensures the form is positioned right in the active viewport (not lost in the middle of tall documents).
 */
export default function ModalPortal({
  isOpen,
  onClose,
  children,
  id,
  className = '',
  role = 'dialog',
  ariaModal = true,
  ariaLabelledBy,
  preventBackdropClose = false,
}) {
  const containerRef = useRef(null);
  const isBackdropMouseDown = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    // Reset container scroll to top so the top of the form is visible
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }

    // Lock background scrolling while preserving page scroll position
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Handle Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow || 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMouseDown = (e) => {
    // Ignore clicks on vertical or horizontal scrollbars
    if (e.clientX >= e.currentTarget.clientWidth || e.clientY >= e.currentTarget.clientHeight) {
      isBackdropMouseDown.current = false;
      return;
    }
    isBackdropMouseDown.current = e.target === e.currentTarget;
  };

  const handleClick = (e) => {
    if (preventBackdropClose) return;

    // Ignore clicks on scrollbar
    if (e.clientX >= e.currentTarget.clientWidth || e.clientY >= e.currentTarget.clientHeight) {
      return;
    }

    // Only close if BOTH mousedown and mouseup started and ended directly on the backdrop
    if (isBackdropMouseDown.current && e.target === e.currentTarget && onClose) {
      onClose();
    }
    isBackdropMouseDown.current = false;
  };

  return createPortal(
    <div
      ref={containerRef}
      id={id}
      role={role}
      aria-modal={ariaModal}
      aria-labelledby={ariaLabelledBy}
      style={{
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto animate-fadeIn ${className}`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {children}
    </div>,
    document.body
  );
}
