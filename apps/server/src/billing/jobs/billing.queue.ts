export const BILLING_QUEUE = 'billing-daily';
export const BILLING_DAILY_JOB = 'billing-daily-run';
/**
 * Spec §6.1 and §6.4: a daily job posts monthly charges and sends reminders.
 * Fixed to 00:30 Cairo time, just after the 1st-of-the-month due moment, so a month's charge appears
 * that night rather than up to a day late (an "every 24h since boot" schedule drifts with restarts).
 */
export const BILLING_DAILY_CRON = '30 0 * * *';
export const BILLING_DAILY_TZ = 'Africa/Cairo';
