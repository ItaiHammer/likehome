export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

/** Full name for a state code ("FL", "D.C."), or null when it isn't one */
export function stateName(code: string | null | undefined): string | null {
  return US_STATES[(code ?? '').replaceAll('.', '').trim().toUpperCase()] ?? null
}

/** The state a full name stands for, ignoring case ("new york" → "New York"); Georgia is left to the country */
export function stateNamed(name: string | null | undefined): string | null {
  const wanted = (name ?? '').trim().toLowerCase()
  if (!wanted || wanted === 'georgia') return null
  return Object.values(US_STATES).find((state) => state.toLowerCase() === wanted) ?? null
}

/** The state at the front of a LiteAPI hotel's zip ("NV 89109" → "Nevada"), or null */
export function stateFromZip(zip: string | null | undefined): string | null {
  return stateName(/^([A-Z]{2})\b/.exec((zip ?? '').trim())?.[1])
}
