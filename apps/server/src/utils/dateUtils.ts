export function subtractDays(isoString: string, days: number) {
  const date = new Date(isoString);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}
