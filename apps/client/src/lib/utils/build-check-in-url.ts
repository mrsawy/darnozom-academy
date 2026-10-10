export function buildCheckInUrl(courseId: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/student-dashboard/check-in?courseId=${encodeURIComponent(courseId)}`;
}
