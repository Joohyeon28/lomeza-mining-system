import type { Group } from './shifts'

const KEY = 'shiftAnchor'

export function getShiftAnchor(): { anchorDate: Date; anchorGroup: Group } | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed) return null
    const date = parsed.date ? new Date(parsed.date) : new Date()
    const group = (parsed.group || 'A') as Group
    return { anchorDate: date, anchorGroup: group }
  } catch (e) {
    return null
  }
}

export function setShiftAnchor(group: Group, date?: Date) {
  try {
    const payload = { group, date: (date || new Date()).toISOString().split('T')[0] }
    localStorage.setItem(KEY, JSON.stringify(payload))
  } catch (e) {
    // ignore storage errors
  }
}
