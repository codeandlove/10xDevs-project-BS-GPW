/**
 * Validation helpers for User Management API
 */

/**
 * Waliduje czy wartość jest prawidłowym UUID v4.
 * @param value - Wartość do walidacji
 * @returns true jeśli wartość jest UUID
 */
export function isUUID(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(value);
}

/**
 * Waliduje czy wartość jest prawidłowym adresem email.
 * @param value - Wartość do walidacji
 * @returns true jeśli wartość jest emailem
 */
export function isEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Waliduje czy wartość jest prawidłowym obiektem metadata.
 * @param value - Wartość do walidacji
 * @returns true jeśli wartość jest obiektem (nie array, nie null)
 */
export function isValidMetadata(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
