'use client';

import { useEffect } from 'react';

/**
 * Custom hook to lock body scrolling when a modal or dialog is open.
 * Saves the original overflow value and restores it upon closing or unmounting.
 */
export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;

    // Save the original body and html overflow styles
    const originalBodyStyle = window.getComputedStyle(document.body).overflow;
    const originalHtmlStyle = window.getComputedStyle(document.documentElement).overflow;
    
    // Prevent scrolling on both body and html
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Restore the original overflow styles upon unmounting or when lock status changes
    return () => {
      document.body.style.overflow = originalBodyStyle;
      document.documentElement.style.overflow = originalHtmlStyle;
    };
  }, [lock]);
}
