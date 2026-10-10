'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { HttpTypes } from '@medusajs/types';
import {
  getMedusaClient,
  getMedusaCartId,
  setMedusaCartId,
  type StoreCart,
  type StoreCartLineItem,
} from '@/lib/medusa-client';

export interface CartItem {
  lineItemId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  total: number;
  thumbnail: string | null;
  productId: string | null;
  variantId: string | null;
  variantTitle: string | null;
  format: 'paper' | 'digital' | string | null;
}

interface CartContextValue {
  cart: StoreCart | null;
  isLoading: boolean;
  isMutating: boolean;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  total: number;
  currency: string;
  hasPaperItems: boolean;
  hasDigitalItems: boolean;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  updateQuantity: (lineItemId: string, quantity: number) => Promise<void>;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

const CART_FIELDS =
  '+items,+items.variant,+items.variant.metadata,+items.product,+items.product.metadata';

function normalizeLineItem(item: StoreCartLineItem): CartItem {
  const variant = (item as unknown as { variant?: HttpTypes.StoreProductVariant })?.variant;
  const variantMeta = variant?.metadata as Record<string, unknown> | undefined;
  const product = (item as unknown as { product?: HttpTypes.StoreProduct })?.product;

  let format: string | null = null;
  if (typeof variantMeta?.kind === 'string') {
    format = variantMeta.kind;
  } else if (variant?.title?.toLowerCase().includes('digital') || variant?.title?.toLowerCase().includes('رقمي')) {
    format = 'digital';
  } else if (variant?.title?.toLowerCase().includes('paper') || variant?.title?.toLowerCase().includes('ورقي')) {
    format = 'paper';
  }

  const unitPrice = typeof item.unit_price === 'number' ? item.unit_price : 0;
  const quantity = typeof item.quantity === 'number' ? item.quantity : 1;
  const total = typeof item.total === 'number' ? item.total : unitPrice * quantity;

  return {
    lineItemId: item.id,
    title: item.title || product?.title || 'Book',
    quantity,
    unitPrice,
    total,
    thumbnail: item.thumbnail || product?.thumbnail || null,
    productId: product?.id || (item as unknown as { product_id?: string }).product_id || null,
    variantId: variant?.id || item.variant_id || null,
    variantTitle: variant?.title || null,
    format,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<StoreCart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const sdk = useMemo(() => getMedusaClient(), []);

  const getOrCreateCart = useCallback(async (): Promise<StoreCart> => {
    const existingId = getMedusaCartId();
    if (existingId) {
      try {
        const { cart: retrieved } = await sdk.store.cart.retrieve(existingId, {
          fields: CART_FIELDS,
        });
        if (retrieved && !retrieved.completed_at) {
          return retrieved;
        }
      } catch {
        // Cart not found or expired; recreate below
        setMedusaCartId(null);
      }
    }

    const { cart: newCart } = await sdk.store.cart.create(
      {},
      { fields: CART_FIELDS }
    );
    setMedusaCartId(newCart.id);
    return newCart;
  }, [sdk]);

  const refreshCart = useCallback(async () => {
    const cartId = getMedusaCartId();
    if (!cartId) {
      setCart(null);
      return;
    }
    try {
      const { cart: retrieved } = await sdk.store.cart.retrieve(cartId, {
        fields: CART_FIELDS,
      });
      if (retrieved && !retrieved.completed_at) {
        setCart(retrieved);
      } else {
        setMedusaCartId(null);
        setCart(null);
      }
    } catch {
      setMedusaCartId(null);
      setCart(null);
    }
  }, [sdk]);

  useEffect(() => {
    let active = true;
    (async () => {
      setIsLoading(true);
      try {
        const c = await getOrCreateCart();
        if (active) setCart(c);
      } catch (err) {
        console.error('[CartProvider] Failed to init cart:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [getOrCreateCart]);

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      setIsMutating(true);
      try {
        const activeCart = await getOrCreateCart();
        const { cart: updated } = await sdk.store.cart.createLineItem(activeCart.id, {
          variant_id: variantId,
          quantity,
        });
        setCart(updated);
      } catch (err) {
        console.error('[CartProvider] Failed to add item:', err);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [getOrCreateCart, sdk]
  );

  const removeItem = useCallback(
    async (lineItemId: string) => {
      if (!cart) return;
      setIsMutating(true);
      try {
        const { parent: updated } = await sdk.store.cart.deleteLineItem(cart.id, lineItemId);
        if (updated) {
          setCart(updated as StoreCart);
        } else {
          await refreshCart();
        }
      } catch (err) {
        console.error('[CartProvider] Failed to remove item:', err);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [cart, sdk, refreshCart]
  );

  const updateQuantity = useCallback(
    async (lineItemId: string, quantity: number) => {
      if (!cart) return;
      if (quantity <= 0) {
        return removeItem(lineItemId);
      }
      setIsMutating(true);
      try {
        const { cart: updated } = await sdk.store.cart.updateLineItem(cart.id, lineItemId, {
          quantity,
        });
        setCart(updated);
      } catch (err) {
        console.error('[CartProvider] Failed to update item:', err);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [cart, sdk, removeItem]
  );

  const clearCart = useCallback(() => {
    setMedusaCartId(null);
    setCart(null);
  }, []);

  const items = useMemo(() => {
    if (!cart?.items) return [];
    return cart.items.map(normalizeLineItem);
  }, [cart]);

  const itemCount = useMemo(
    () => items.reduce((acc, it) => acc + it.quantity, 0),
    [items]
  );

  const subtotal = useMemo(() => {
    if (typeof cart?.subtotal === 'number') return cart.subtotal;
    return items.reduce((acc, it) => acc + it.total, 0);
  }, [cart, items]);

  const total = useMemo(() => {
    if (typeof cart?.total === 'number') return cart.total;
    return subtotal;
  }, [cart, subtotal]);

  const currency = useMemo(
    () => (cart?.currency_code || 'EGP').toUpperCase(),
    [cart]
  );

  const hasPaperItems = useMemo(
    () => items.some((it) => it.format === 'paper'),
    [items]
  );

  const hasDigitalItems = useMemo(
    () => items.some((it) => it.format === 'digital'),
    [items]
  );

  const value: CartContextValue = {
    cart,
    isLoading,
    isMutating,
    items,
    itemCount,
    subtotal,
    total,
    currency,
    hasPaperItems,
    hasDigitalItems,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
