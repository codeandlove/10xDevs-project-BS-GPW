/**
 * Allowed domains configuration for Stripe redirects
 * Security: Only whitelisted domains can be used in success_url, cancel_url, return_url
 */

/**
 * Get allowed domains based on environment
 */
export const ALLOWED_DOMAINS =
  import.meta.env.MODE === "production"
    ? [
        "https://app.blackswangrid.com",
        // Add more production domains here
      ]
    : ["http://localhost:4321", "http://localhost:3000", "http://127.0.0.1:4321", "http://127.0.0.1:3000"];

/**
 * Validates if URL starts with one of the allowed domains
 * @param url - URL to validate
 * @returns true if URL is allowed
 */
export function isAllowedUrl(url: string): boolean {
  return ALLOWED_DOMAINS.some((domain) => url.startsWith(domain));
}
