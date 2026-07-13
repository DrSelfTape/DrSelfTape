import { useRef, useCallback } from 'react';

/**
 * Custom hook for capturing share images using html2canvas
 * Handles cloning, rendering, capture, and cleanup
 * 
 * @param {Object} options
 * @param {Function} options.onError - Error callback
 * @returns {Object} { captureImage, generatingRef }
 */
export const useShareImageCapture = ({ onError }) => {
  const generatingRef = useRef(false);

  /**
   * Captures an image from a template element using html2canvas
   * 
   * @param {HTMLElement} templateElement - The template element to capture
   * @param {Object} dimensions - { width, height, scale }
   * @returns {Promise<string>} Blob URL of the generated image
   */
  const captureImage = useCallback(async (templateElement, dimensions) => {
    if (generatingRef.current) {
      throw new Error('Capture already in progress');
    }

    if (!templateElement || !document.body.contains(templateElement)) {
      throw new Error('Template element not found in DOM');
    }

    generatingRef.current = true;
    let clone = null;

    try {
      // Dynamically import html2canvas
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;

      if (!html2canvas || typeof html2canvas !== 'function') {
        throw new Error('html2canvas not available');
      }

      const { width, height, scale } = dimensions;

      // Clone the template element
      clone = templateElement.cloneNode(true);
      const cloneId = `badge-capture-clone-${Date.now()}`;
      clone.id = cloneId;
      clone.removeAttribute('data-html2canvas-ignore');

      // Style clone for capture - position offscreen but visible to html2canvas
      clone.style.cssText = `
        position: fixed !important;
        left: -9999px !important;
        top: -9999px !important;
        width: ${width}px !important;
        height: ${height}px !important;
        visibility: visible !important;
        opacity: 1 !important;
        z-index: -9999 !important;
        display: flex !important;
        pointer-events: none !important;
        overflow: hidden !important;
      `;

      // Append clone to body
      document.body.appendChild(clone);

      // Wait for clone to render
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              // Verify clone is in DOM and has dimensions
              if (!document.body.contains(clone)) {
                throw new Error('Clone not in DOM');
              }
              const rect = clone.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) {
                throw new Error('Clone has zero dimensions');
              }
              resolve();
            }, 100); // Reduced wait time - 100ms is sufficient
          });
        });
      });

      // Capture with html2canvas - optimized for gradient and color rendering
      const canvas = await html2canvas(clone, {
        width: width,
        height: height,
        scale: scale,
        backgroundColor: null, // Transparent background to preserve gradient
        useCORS: true,
        logging: false,
        allowTaint: false, // Changed to false for better color rendering
        foreignObjectRendering: false,
        removeContainer: false,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // Just guarantee the clone is visible for capture — render whatever the
          // template's own (explicit, inline) styles are. (This previously forced
          // a purple gradient + white text, which is why the hook was unusable for
          // a branded card. Templates should use explicit hex colors so
          // html2canvas renders them faithfully.)
          const clonedEl = clonedDoc.getElementById(cloneId);
          if (clonedEl) {
            clonedEl.style.visibility = 'visible';
            clonedEl.style.opacity = '1';
            clonedEl.style.display = 'flex';
          }
        },
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Failed to generate canvas');
      }

      // Convert canvas to blob
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size > 0) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/png',
          1.0
        );
      });

      // Create object URL and preload image
      const url = URL.createObjectURL(blob);

      // Preload image to ensure it's ready before returning
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load image'));
        };
        img.src = url;
      });

      return url;
    } catch (error) {
      console.error('Image capture error:', error);
      if (onError) {
        onError(error);
      }
      throw error;
    } finally {
      // ALWAYS remove clone in finally block
      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
      generatingRef.current = false;
    }
  }, [onError]);

  return { captureImage, generatingRef };
};
