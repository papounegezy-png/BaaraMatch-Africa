/**
 * Display-only casing fix for titles typed ALL CAPS or all lowercase
 * ("CHEF DE CHANTIER", "dev") → sentence case ("Chef de chantier", "Dev").
 * Anything already mixed-case is returned untouched, and the stored value
 * never changes. Accents survive (toLocale*Case with "fr"). A single short
 * all-caps word ("BTP", "RH") is kept as-is: it's most likely an acronym.
 */
export function formatJobTitle(title: string | null | undefined): string {
  const value = (title ?? "").trim();
  const upper = value.toLocaleUpperCase("fr");
  const lower = value.toLocaleLowerCase("fr");
  // No cased letter at all (digits, symbols, empty): nothing to fix.
  if (upper === lower) return value;

  const isAllCaps = value === upper && value !== lower;
  const isAllLower = value === lower && value !== upper;
  if (!isAllCaps && !isAllLower) return value;
  if (isAllCaps && !/\s/.test(value) && value.length <= 4) return value;

  return lower.charAt(0).toLocaleUpperCase("fr") + lower.slice(1);
}
