/**
 * Escape special characters in search input for safe use in SQL LIKE patterns.
 * Escapes: %, _, and backslash
 * These characters have special meaning in SQL LIKE expressions.
 */
export function escapeSearchInput(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}
