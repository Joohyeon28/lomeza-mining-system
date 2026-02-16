// Utility functions for 3-group shift rotation (A, B, C)
// Rotation rule:
// - There are three groups: A, B, C
// - On the reference (anchor) date the anchor group is the DAY shift,
//   the next group (A->B->C) is NIGHT and the remaining group is HOME.
// - Each day the assignment rotates "backwards" one step so the day
//   group sequence is anchor, previous, previous, ... (i.e. step -1 mod 3).

export type Group = 'A' | 'B' | 'C'

const ALL_GROUPS: Group[] = ['A', 'B', 'C']

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysBetween(a: Date, b: Date) {
  const ad = startOfLocalDay(a).getTime()
  const bd = startOfLocalDay(b).getTime()
  return Math.round((bd - ad) / (1000 * 60 * 60 * 24))
}

export function getDayGroup(date: Date, anchorDate: Date, anchorGroup: Group): Group {
  const offset = daysBetween(anchorDate, date)
  const anchorIndex = ALL_GROUPS.indexOf(anchorGroup)
  // dayIndex = anchorIndex - offset (mod 3)
  const dayIndex = ((anchorIndex - (offset % 3)) + 3) % 3
  return ALL_GROUPS[dayIndex]
}

export type Duty = 'DAY' | 'NIGHT' | 'HOME'

export function getRotationForDate(date: Date, anchorDate: Date, anchorGroup: Group) {
  const dayGroup = getDayGroup(date, anchorDate, anchorGroup)
  const dayIndex = ALL_GROUPS.indexOf(dayGroup)
  const nightIndex = (dayIndex + 1) % 3
  const homeIndex = (dayIndex + 2) % 3

  return {
    [ALL_GROUPS[dayIndex]]: 'DAY' as Duty,
    [ALL_GROUPS[nightIndex]]: 'NIGHT' as Duty,
    [ALL_GROUPS[homeIndex]]: 'HOME' as Duty,
  } as Record<Group, Duty>
}

// Returns 'DAY' for times from 06:00 (inclusive) to 18:00 (exclusive), else 'NIGHT'
export function getShiftKindForTime(date: Date) {
  const h = date.getHours()
  return h >= 6 && h < 18 ? 'DAY' : 'NIGHT'
}

// Convenience: get duty for a specific group on a date
export function getGroupDuty(date: Date, group: Group, anchorDate: Date, anchorGroup: Group): Duty {
  const rot = getRotationForDate(date, anchorDate, anchorGroup)
  return rot[group]
}
