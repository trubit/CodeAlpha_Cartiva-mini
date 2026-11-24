/**
 * Cartiva Mini — Slug Utility
 * Generates URL-safe, collision-free slugs from text with unicode normalization.
 */

export const generateSlugBase = (text: string): string => {
  return text
    .toString()
    .normalize('NFKD') // Normalize accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with single hyphen
    .replace(/^-+|-+$/g, ''); // Trim leading and trailing hyphens
};

/**
 * Generates a unique slug by checking against an existing uniqueness predicate.
 * If collision occurs, appends incrementing integer suffix (-1, -2, etc.).
 */
export const resolveUniqueSlug = async (
  baseText: string,
  checkUniqueFn: (slug: string) => Promise<boolean>,
  currentSlug?: string
): Promise<string> => {
  const baseSlug = generateSlugBase(baseText) || 'product';

  if (currentSlug && baseSlug === currentSlug) {
    return currentSlug;
  }

  let candidate = baseSlug;
  let counter = 1;

  while (!(await checkUniqueFn(candidate))) {
    candidate = `${baseSlug}-${counter}`;
    counter++;
  }

  return candidate;
};
