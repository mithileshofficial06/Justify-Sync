const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * v5 Stage 5: custody duration = today - arrest date.
 * Treated as one continuous stretch — a documented simplification
 * (v4 Flaw #16); production tracks discrete custody intervals instead.
 */
export function daysInCustody(arrestDate: Date, today: Date = new Date()): number {
  const diffMs = today.getTime() - arrestDate.getTime();
  return Math.floor(diffMs / MS_PER_DAY);
}

export function daysSince(date: Date, today: Date = new Date()): number {
  const diffMs = today.getTime() - date.getTime();
  return Math.floor(diffMs / MS_PER_DAY);
}
