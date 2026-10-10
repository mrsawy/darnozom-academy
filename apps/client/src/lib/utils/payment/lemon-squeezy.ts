/**
 * Lemon Squeezy frontend integration using Lemon.js (official script).
 * @see https://docs.lemonsqueezy.com/help/lemonjs/what-is-lemonjs
 * @see https://docs.lemonsqueezy.com/help/lemonjs/opening-overlays
 * @see https://docs.lemonsqueezy.com/help/lemonjs/handling-events
 *
 * Note: The npm package @lemonsqueezy/lemonsqueezy.js is for backend only (API key).
 * Frontend uses Lemon.js loaded from CDN.
 */

const LEMON_SCRIPT_URL = 'https://app.lemonsqueezy.com/js/lemon.js';

/** Lemon.js checkout / overlay event names. */
export type LemonSqueezyEventName =
  | 'Checkout.Success'
  | 'PaymentMethodUpdate.Mounted'
  | 'PaymentMethodUpdate.Closed'
  | 'PaymentMethodUpdate.Updated';

/** Event payload for Checkout.Success (Order object). */
export interface LemonSqueezyOrderData {
  type: 'orders';
  id: string;
  attributes?: Record<string, unknown>;
}

export interface LemonSqueezyOverlayEvent {
  event: LemonSqueezyEventName;
  data?: LemonSqueezyOrderData;
}

/** Lemon.js global API (injected by script). */
export interface LemonSqueezyGlobal {
  Url: {
    Open: (checkoutUrl: string) => void;
  };
  Setup: (opts: { eventHandler: (event: LemonSqueezyOverlayEvent) => void }) => void;
}

declare global {
  interface Window {
    LemonSqueezy?: LemonSqueezyGlobal;
    createLemonSqueezy?: () => void;
  }
}

/**
 * Loads the Lemon.js script once. Safe to call multiple times.
 * @returns Promise that resolves when the script is loaded (or already present).
 */
export function loadLemonSqueezyScript(): Promise<void> {
  if (globalThis.window) {
    return Promise.reject(new Error('Lemon Squeezy script can only be loaded in the browser'));
  }

  const existing = document.querySelector(`script[src="${LEMON_SCRIPT_URL}"]`);
  if (existing) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = LEMON_SCRIPT_URL;
    script.defer = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () =>
      reject(new Error('Failed to load Lemon Squeezy script'))
    );
    document.head.append(script);
  });
}

/**
 * Ensures Lemon.js is loaded and returns the global API.
 * @throws If script fails to load or LemonSqueezy is not available.
 */
export async function getLemonSqueezy(): Promise<LemonSqueezyGlobal> {
  await loadLemonSqueezyScript();
  if (!globalThis.window.LemonSqueezy) {
    throw new Error('Lemon Squeezy script did not expose window.LemonSqueezy');
  }
  return globalThis.window.LemonSqueezy;
}

/**
 * Opens a Lemon Squeezy checkout URL in the overlay (modal).
 * Loads Lemon.js if not already loaded.
 * @param checkoutUrl - URL from Checkouts API (e.g. response data.attributes.url).
 */
export async function openLemonSqueezyCheckout(checkoutUrl: string): Promise<void> {
  const ls = await getLemonSqueezy();
  ls.Url.Open(checkoutUrl);
}

/**
 * Opens a Lemon Squeezy payment method update URL in the overlay.
 * @param updatePaymentUrl - Signed URL from subscription urls.update_payment_method.
 */
export async function openLemonSqueezyPaymentMethodUpdate(updatePaymentUrl: string): Promise<void> {
  const ls = await getLemonSqueezy();
  ls.Url.Open(updatePaymentUrl);
}

/**
 * Re-initialize Lemon.js after dynamic content (e.g. React/Vue mount).
 * Call this in useEffect/onMounted when using overlay with SPA so .lemonsqueezy-button links work.
 * @see https://docs.lemonsqueezy.com/help/checkout/checkout-overlay#use-with-js-frameworks
 */
export async function createLemonSqueezy(): Promise<void> {
  await loadLemonSqueezyScript();
  if (typeof globalThis.window.createLemonSqueezy === 'function') {
    globalThis.window.createLemonSqueezy();
  }
}

/**
 * Registers a global event handler for Lemon Squeezy overlay events.
 * Call after loadLemonSqueezyScript() (e.g. in getLemonSqueezy flow).
 */
export async function setupLemonSqueezyEvents(
  handler: (event: LemonSqueezyOverlayEvent) => void
): Promise<void> {
  const ls = await getLemonSqueezy();
  ls.Setup({ eventHandler: handler });
}
