/** Display-only title cleanup. The full title remains in stored data and URLs. */
export function stayDisplayName(name: string): string {
  const original = name.trim();
  const withoutPromo = original
    // A bare "New" can be part of a real name (e.g. New York Marriott Marquis).
    .replace(/^(?:(?:new|just listed|hot deal|special offer)\b\s*(?:!+\s*[-:–—]?|[-:–—])\s*)+/i, "")
    .replace(/!+/g, "")
    // Strip actual promotional taglines, never location qualifiers like "- Near Airport".
    .replace(/\s+[-–—|:]\s*(?:perfect|ideal|great|wonderful|excellent|lovely)\s+for\b.*$/i, "")
    .replace(/\s+(?:perfect|ideal|great|wonderful|excellent|lovely)\s+for\b.*$/i, "")
    .trim();
  const candidate = withoutPromo || original;
  // Normalize shouting, but preserve acronyms inside normal title-cased names.
  return /[A-Z]/.test(candidate) && candidate === candidate.toUpperCase()
    ? candidate.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    : candidate;
}
