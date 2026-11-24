/**
 * Cartiva Mini — Search Utility
 * Safe query normalization and regex escaping to prevent ReDoS and injection attacks.
 */

/**
 * Escapes special regex characters in a user-provided string to prevent
 * Regular Expression Denial of Service (ReDoS) and malformed query errors.
 */
export const escapeRegex = (text: string): string => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

/**
 * Normalizes customer search query:
 * - Trims leading/trailing whitespace
 * - Collapses consecutive spaces
 * - Enforces maximum length bounds to prevent oversized payload attacks
 */
export const normalizeSearchQuery = (raw: string, maxLength = 100): string => {
  if (!raw) return '';
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxLength);
};

/**
 * Anonymizes client IP address to protect customer privacy in search analytics.
 * IPv4: replaces last octet with 0 (e.g. 192.168.1.45 -> 192.168.1.0)
 * IPv6: replaces last 80 bits with 0
 */
export const anonymizeIp = (ip?: string): string => {
  if (!ip) return 'anonymous';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 3).join(':')}::0`;
  }
  return 'anonymous';
};
