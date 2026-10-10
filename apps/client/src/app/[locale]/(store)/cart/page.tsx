'use client';

import { useTranslations } from 'next-intl';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  Truck,
  FileText,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/lib/context/cart-context';
import { ROUTE_BOOKS, ROUTE_CHECKOUT } from '@/lib/data/constants/routes.constants';

export default function CartPage() {
  const t = useTranslations('cart');
  const {
    items,
    itemCount,
    subtotal,
    total,
    currency,
    hasPaperItems,
    hasDigitalItems,
    updateQuantity,
    removeItem,
    clearCart,
    isMutating,
  } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
          <ShoppingBag className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t('emptyTitle')}</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
          {t('emptyMessage')}
        </p>
        <Button asChild size="lg">
          <Link href={ROUTE_BOOKS}>{t('exploreBooks')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {itemCount} {t('itemsCount')}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => clearCart()}
          disabled={isMutating}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          {t('clearCart')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.lineItemId} className="overflow-hidden">
              <CardContent className="p-4 sm:p-5 flex gap-4 items-center">
                {/* Thumbnail */}
                <div className="relative aspect-[3/4] w-20 shrink-0 rounded-lg bg-muted overflow-hidden border flex items-center justify-center">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <BookOpen className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>

                {/* Info & Title */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.format && (
                      <Badge
                        variant={item.format === 'digital' ? 'info' : 'secondary'}
                        className="text-[10px] py-0 px-1.5"
                      >
                        {item.format === 'digital' ? t('digitalPdf') : t('paper')}
                      </Badge>
                    )}
                  </div>

                  <Link
                    href={item.productId ? `/books/${item.productId}` : ROUTE_BOOKS}
                    className="block font-semibold text-sm sm:text-base hover:text-primary transition-colors truncate"
                    title={item.title}
                  >
                    {item.title}
                  </Link>

                  <div className="text-xs text-muted-foreground">
                    {item.unitPrice} {currency} {t('perUnit')}
                  </div>
                </div>

                {/* Quantity Controls & Total */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                  {/* Quantity stepper */}
                  <div className="flex items-center rounded-lg border bg-background">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.lineItemId, item.quantity - 1)}
                      disabled={isMutating}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.lineItemId, item.quantity + 1)}
                      disabled={isMutating}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="min-w-[5rem] text-end font-bold text-sm sm:text-base text-foreground">
                    {item.total} {currency}
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.lineItemId)}
                    disabled={isMutating}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Continue shopping link */}
          <div className="pt-2">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href={ROUTE_BOOKS}>
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                <span>{t('continueShopping')}</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <Card className="sticky top-24">
            <CardContent className="p-6 space-y-5">
              <h2 className="font-bold text-lg text-foreground border-b pb-3">
                {t('orderSummary')}
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('subtotal')}</span>
                  <span className="font-semibold text-foreground">
                    {subtotal} {currency}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('shipping')}</span>
                  <span>
                    {hasPaperItems ? t('shippingCalculatedAtCheckout') : t('freeDigital')}
                  </span>
                </div>

                <div className="pt-3 border-t flex justify-between items-baseline">
                  <span className="font-bold text-base text-foreground">{t('total')}</span>
                  <span className="font-extrabold text-2xl text-primary">
                    {total} {currency}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button asChild size="lg" className="w-full font-bold gap-2">
                <Link href={ROUTE_CHECKOUT}>
                  <span>{t('proceedToCheckout')}</span>
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
              </Button>

              {/* Guarantee badges */}
              <div className="pt-3 border-t space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>{t('secureCheckout')}</span>
                </div>
                {hasDigitalItems && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span>{t('instantDigitalAccess')}</span>
                  </div>
                )}
                {hasPaperItems && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary shrink-0" />
                    <span>{t('fastShippingEgypt')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
