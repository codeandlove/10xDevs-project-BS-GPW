/**
 * Cache utilities
 * Helper functions for cache key generation and management
 */

/**
 * Generate cache key hash for symbol arrays
 * - For <=5 symbols: returns comma-separated string
 * - For >5 symbols: returns MD5 hash (first 8 chars) to avoid LocalStorage quota issues
 *
 * @param symbols - Array of ticker symbols
 * @returns Cache key string
 *
 * @example
 * hashSymbols(["PKN", "PKO"]) // "PKN,PKO"
 * hashSymbols([...460 symbols]) // "a1b2c3d4" (MD5 hash)
 */
export function hashSymbols(symbols: string[]): string {
  if (symbols.length === 0) {
    return "all";
  }

  // For small arrays, use comma-separated string (readable and cacheable)
  if (symbols.length <= 5) {
    return [...symbols].sort().join(",");
  }

  // For large arrays (>5 symbols), use MD5 hash to prevent:
  // - LocalStorage quota exceeded errors
  // - Long URL query params
  // - Cache key too long issues
  const sorted = [...symbols].sort().join(",");

  // MD5 hash implementation using Web Crypto API
  // Note: This runs in browser environment (client-side)
  const hash = simpleHash(sorted);

  // Return first 8 characters of hash (sufficient for uniqueness)
  return hash.substring(0, 8);
}

/**
 * Simple hash function (FNV-1a algorithm)
 * Used for generating short, collision-resistant hashes
 * Compatible with both browser and Node.js environments
 */
function simpleHash(str: string): string {
  let hash = 2166136261; // FNV offset basis

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  // Convert to hex string
  return (hash >>> 0).toString(16).padStart(8, "0");
}
