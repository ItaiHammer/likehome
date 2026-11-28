import { travelerTypes } from '../app/search/types.ts'

/** Keep every supported traveler category, regardless of case or duplicates. */
export function normalizeTravelerCategories(categories: readonly string[] | null | undefined): string[] {
  if (!categories) return []
  const canonical = new Map<string, string>(travelerTypes.map((name) => [name.toLowerCase(), name]))
  const seen = new Set<string>()
  const result: string[] = []
  for (const entry of categories) {
    if (typeof entry !== 'string') continue
    const value = entry.trim()
    if (!value) continue
    const label = canonical.get(value.toLowerCase()) ?? value
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(label)
  }
  return result
}
