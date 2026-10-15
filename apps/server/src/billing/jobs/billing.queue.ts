export const BILLING_QUEUE = 'billing-daily';
export const BILLING_DAILY_JOB = 'billing-daily-run';
/** Spec §6.1 and §6.4: a daily job posts monthly charges and sends reminders. */
export const BILLING_DAILY_EVERY_MS = 24 * 60 * 60 * 1000;
