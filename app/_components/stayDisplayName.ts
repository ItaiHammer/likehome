/** Display-only title cleanup. The full title remains in stored data and URLs. */
export function stayDisplayName(name: string): string {
  const original = name.trim();
  const withoutPromo = original
    .replace(/^(?:(?:new|just listed|hot deal|special offer)\s*!?\s*[-:–—]?\s*)+/i, "")
    .replace(/!+/g, "")
    .replace(/\s+(?:perfect|ideal|great|wonderful|excellent|lovely)\s+for\s+.+$/i, "")
    .replace(/\s+[-–—|:]\s*(?:perfect|ideal|great|wonderful|excellent|lovely|close to|near|steps from)\b.+$/i, "")
    .trim();
  const candidate = withoutPromo || original;
  // Normalize shouting, but preserve acronyms inside normal title-cased names.
  return /[A-Z]/.test(candidate) && candidate === candidate.toUpperCase()
    ? candidate.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    : candidate;
}
