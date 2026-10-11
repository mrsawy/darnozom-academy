import type { EnrollmentTrendSeriesPoint } from '@darnozom/shared-types';

/** Aggregate daily points into week (Monday start) or calendar month buckets. */
export type ReportTimeBucket = 'day' | 'week' | 'month';

function parseYmd(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function formatYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Bucket key for grouping: same string for day, Monday date for week, YYYY-MM for month. */
export function bucketKeyForDate(dateStr: string, bucket: ReportTimeBucket): string {
  const d = parseYmd(dateStr);
  if (bucket === 'day') {
    return dateStr;
  }
  if (bucket === 'month') {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  const w = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = w.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  w.setUTCDate(w.getUTCDate() + diff);
  return formatYmd(w);
}

export function aggregateByBucket(
  points: { date: string; value: number }[],
  bucket: ReportTimeBucket
): { date: string; value: number }[] {
  if (bucket === 'day') {
    return points.map((p) => ({ date: p.date, value: p.value }));
  }
  const map = new Map<string, number>();
  for (const p of points) {
    const k = bucketKeyForDate(p.date, bucket);
    map.set(k, (map.get(k) ?? 0) + p.value);
  }
  return [...map.entries()]
    .toSorted((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));
}

/** Bucket per-course enrollment counts (sums `count` within each bucket per course). */
export function aggregateEnrollmentTrendsByBucket(
  rows: EnrollmentTrendSeriesPoint[],
  bucket: ReportTimeBucket
): EnrollmentTrendSeriesPoint[] {
  if (bucket === 'day') {
    return rows;
  }
  const map = new Map<string, EnrollmentTrendSeriesPoint>();
  for (const row of rows) {
    const bucketDate = bucketKeyForDate(row.date, bucket);
    const key = `${bucketDate}|${row.courseId}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += row.count;
      if (row.courseName !== 'Course') {
        existing.courseName = row.courseName;
      }
    } else {
      map.set(key, {
        date: bucketDate,
        courseId: row.courseId,
        courseName: row.courseName,
        count: row.count,
      });
    }
  }
  return [...map.values()].toSorted(
    (a, b) => a.date.localeCompare(b.date) || a.courseId.localeCompare(b.courseId)
  );
}
