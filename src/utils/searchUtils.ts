/**
 * Utility functions for optimized search functionality
 * - Case-insensitive (mode: insensitive trong Prisma)
 * - Accent/diacritic-insensitive (unaccent text trước khi search)
 */

/**
 * Normalize string: remove accents/diacritics and convert to lowercase
 * @param str - Input string
 * @returns Normalized string
 */
export function normalizeSearchString(str: string): string {
  if (!str) return "";

  return str
    .toLowerCase()
    .normalize("NFD") // Phân tách ký tự và dấu
    .replace(/[\u0300-\u036f]/g, ""); // Loại bỏ các dấu
}

/**
 * Escape special regex characters
 * @param str - String to escape
 * @returns Escaped string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Create optimized search pattern for accent-insensitive and case-insensitive search
 * @param searchTerm - Search term from user
 * @returns Normalized search term
 */
export function getSearchPattern(searchTerm: string): string {
  return normalizeSearchString(searchTerm);
}
