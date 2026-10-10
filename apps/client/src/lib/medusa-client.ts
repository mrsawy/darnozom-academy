import Medusa from '@medusajs/js-sdk';
import type { HttpTypes } from '@medusajs/types';

export type StoreProduct = HttpTypes.StoreProduct;
export type StoreProductVariant = HttpTypes.StoreProductVariant;
export type StoreCart = HttpTypes.StoreCart;
export type StoreCartLineItem = HttpTypes.StoreCartLineItem;
export type StoreOrder = HttpTypes.StoreOrder;

const TOKEN_STORAGE_KEY = 'medusa_customer_token';
const CART_STORAGE_KEY = 'medusa_cart_id';

export function getMedusaCustomerToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setMedusaCustomerToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

export function getMedusaCartId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setMedusaCartId(cartId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (cartId) localStorage.setItem(CART_STORAGE_KEY, cartId);
    else localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

let cachedClient: Medusa | null = null;

export function getMedusaClient(): Medusa {
  if (cachedClient) return cachedClient;

  const baseUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9010';
  const publishableKey =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

  cachedClient = new Medusa({
    baseUrl,
    publishableKey: publishableKey || undefined,
  });

  return cachedClient;
}
