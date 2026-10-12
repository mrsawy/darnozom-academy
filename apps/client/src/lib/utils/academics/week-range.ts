/** The local week (Sunday-first, like the schedule's dayOfWeek) containing `anchor`. */
export function weekRange(anchor: Date): { from: Date; to: Date } {
  const from = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() - anchor.getDay()
  );
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7);
  return { from, to };
}

export function addWeeks(date: Date, weeks: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + weeks * 7);
}
