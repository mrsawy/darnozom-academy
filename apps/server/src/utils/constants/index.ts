function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end--;
  return value.slice(0, end);
}

const clientBase = stripTrailingSlashes(process.env.SECURED_CLIENT_BASE_URL ?? '');
const apiBase = stripTrailingSlashes(process.env.SECURED_BASE_URL ?? '');

function clientPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${clientBase}${normalized}`;
}

/**
 * Browser return URLs after Paymob Unified Checkout (redirection_url).
 * Must be real client routes — Paymob appends success/hmac query params to these.
 */
export const URLS: Record<string, string> = {
  walletPage: clientPath('/student-dashboard/wallet'),
  enrollmentsPage: clientPath('/student-dashboard/courses'),
  parentDashboardPage: clientPath('/parent-dashboard'),
  bookingsPage: clientPath('/student-dashboard/bookings'),
  paymentWebhookPage: `${apiBase}/payment/webhook/paymob`,
};
