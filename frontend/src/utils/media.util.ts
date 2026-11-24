/**
 * Cartiva Mini — Centralized Media & Image URL Utilities
 * Normalizes local upload paths, CDN endpoints, and provides resilient fallbacks.
 */

export const DEFAULT_PRODUCT_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300" fill="none"><rect width="300" height="300" rx="16" fill="%23f1f5f9"/><path d="M100 120l50-30 50 30v70h-100v-70z" stroke="%2394a3b8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="%23e2e8f0"/><circle cx="130" cy="135" r="12" fill="%23cbd5e1"/><path d="M100 175l30-30 20 20 25-25 25 25v15h-100z" fill="%23cbd5e1"/></svg>';

/**
 * Resolves a product or asset image path to a browser-consumable URL.
 */
export const getMediaUrl = (url?: string | null): string => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return DEFAULT_PRODUCT_PLACEHOLDER;
  }

  const cleanUrl = url.trim();

  // Full external URL or data URI
  if (
    cleanUrl.startsWith('http://') ||
    cleanUrl.startsWith('https://') ||
    cleanUrl.startsWith('data:')
  ) {
    return cleanUrl;
  }

  // Local media uploads served via /uploads proxy
  if (cleanUrl.startsWith('/uploads/')) {
    return cleanUrl;
  }

  if (cleanUrl.startsWith('uploads/')) {
    return `/${cleanUrl}`;
  }

  return cleanUrl;
};

/**
 * Graceful image onError handler to prevent broken image badges.
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback: string = DEFAULT_PRODUCT_PLACEHOLDER
): void => {
  const target = e.currentTarget;
  if (target.src !== fallback) {
    target.onerror = null; // Prevent infinite error loops
    target.src = fallback;
  }
};

