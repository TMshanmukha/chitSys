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

  useEffect(() => {
    if (!isOpen) return;

    // Reset container scroll to top so the top of the form is visible
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }

    // Move window smoothly to the form / top of active viewport
    scrollToFormOrModal(id);

    // Lock background scrolling
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
  }, [isOpen, onClose, id]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={containerRef}
      id={id}
      role={role}
      aria-modal={ariaModal}
      aria-labelledby={ariaLabelledBy}
      className={`fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-3 sm:p-6 pt-14 sm:pt-8 pb-12 bg-black/75 backdrop-blur-xs overflow-y-auto animate-fadeIn ${className}`}
      onClick={(e) => {
        if (!preventBackdropClose && e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      {children}
    </div>,
    document.body
  );
}
