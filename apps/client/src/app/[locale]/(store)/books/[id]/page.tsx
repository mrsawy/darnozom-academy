'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  ShoppingBag,
  Check,
  ArrowLeft,
  FileText,
  Truck,
  ShieldCheck,
  AlertCircle,
  Plus,
  Minus,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getMedusaClient,
  type StoreProduct,
  type StoreProductVariant,
} from '@/lib/medusa-client';
import { useCart } from '@/lib/context/cart-context';
import { ROUTE_BOOKS, ROUTE_CHECKOUT } from '@/lib/data/constants/routes.constants';

export default function BookDetailPage() {
  const t = useTranslations('store');
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { addItem, isMutating } = useCart();

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);

  // Fetch single product from Medusa
  const {
    data: product,
    isLoading,
    isError,
  } = useQuery<StoreProduct | null>({
    queryKey: ['medusa-product', productId],
    queryFn: async () => {
      const sdk = getMedusaClient();
      const response = await sdk.store.product.retrieve(productId, {
        fields: '*variants,*variants.calculated_price,*variants.metadata,*categories,*images',
      });
      return response.product || null;
    },
    enabled: Boolean(productId),
  });

  // Selected variant fallback
  const currentVariant: StoreProductVariant | undefined = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return undefined;
    if (selectedVariantId) {
      const found = product.variants.find((v) => v.id === selectedVariantId);
      if (found) return found;
    }
    return product.variants[0];
  }, [product, selectedVariantId]);

  const author = (product?.metadata as Record<string, unknown> | undefined)?.author as
    | string
    | undefined;
  const category = (product?.metadata as Record<string, unknown> | undefined)?.category as
    | string
    | undefined;
  const isbn = (product?.metadata as Record<string, unknown> | undefined)?.isbn as
    | string
    | undefined;

  const currentPrice =
    currentVariant?.calculated_price?.calculated_amount ??
    (currentVariant as unknown as { prices?: Array<{ amount: number }> })?.prices?.[0]?.amount ??
    0;

  const currencyCode = (
    currentVariant?.calculated_price?.currency_code || 'EGP'
  ).toUpperCase();

  const isDigital =
    (currentVariant?.metadata as Record<string, unknown> | undefined)?.kind === 'digital' ||
    currentVariant?.title?.toLowerCase().includes('digital') ||
    currentVariant?.title?.toLowerCase().includes('رقمي');

  const handleAddToCart = async () => {
    if (!currentVariant?.id) return;
    try {
      await addItem(currentVariant.id, quantity);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2500);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  const handleBuyNow = async () => {
    if (!currentVariant?.id) return;
    try {
      await addItem(currentVariant.id, quantity);
      router.push(ROUTE_CHECKOUT);
    } catch (err) {
      console.error('Failed to buy now:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="aspect-[3/4] bg-muted rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded w-1/4" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">{t('bookNotFoundTitle')}</h2>
        <p className="text-muted-foreground mb-6">{t('bookNotFoundMessage')}</p>
        <Button asChild>
          <Link href={ROUTE_BOOKS}>{t('backToBooks')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Breadcrumb / Back */}
      <div className="mb-6">
        <Link
          href={ROUTE_BOOKS}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          <span>{t('backToBooks')}</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
        {/* Cover / Media */}
        <div className="flex flex-col items-center">
          <div className="relative aspect-[3/4] w-full max-w-md rounded-2xl border bg-muted shadow-sm overflow-hidden flex items-center justify-center">
            {product.thumbnail ? (
              <img
                src={product.thumbnail}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground p-8 text-center">
                <BookOpen className="h-20 w-20 stroke-[1.5]" />
                <span className="text-sm font-medium">{product.title}</span>
              </div>
            )}
          </div>
        </div>

        {/* Product Details & Actions */}
        <div className="flex flex-col justify-between">
          <div className="space-y-6">
            {/* Category & Title */}
            <div>
              {category && (
                <Badge variant="outline" className="mb-2 uppercase text-xs">
                  {category}
                </Badge>
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {product.title}
              </h1>
              {author && (
                <p className="mt-1.5 text-base text-muted-foreground">
                  {t('authorPrefix')}: <span className="font-medium text-foreground">{author}</span>
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-primary">
                {currentPrice} {currencyCode}
              </span>
              {isDigital && (
                <Badge variant="info" className="text-xs">
                  {t('digitalEdition')}
                </Badge>
              )}
            </div>

            {/* Format / Variant Selector */}
            {product.variants && product.variants.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  {t('selectFormat')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {product.variants.map((variant) => {
                    const isSelected =
                      currentVariant?.id === variant.id;
                    const vPrice =
                      variant.calculated_price?.calculated_amount ??
                      (variant as unknown as { prices?: Array<{ amount: number }> })?.prices?.[0]
                        ?.amount ??
                      0;
                    const vKind = (variant.metadata as Record<string, unknown> | undefined)?.kind;
                    const isVDigital =
                      vKind === 'digital' ||
                      variant.title?.toLowerCase().includes('digital') ||
                      variant.title?.toLowerCase().includes('رقمي');

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`flex flex-col items-start p-3 rounded-xl border text-start transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                            : 'border-border hover:border-muted-foreground/30 bg-card'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="font-semibold text-sm">
                            {variant.title || (isVDigital ? t('digitalPdf') : t('paper'))}
                          </span>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {vPrice} {currencyCode}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-foreground">
                {t('quantity')}
              </label>
              <div className="flex items-center rounded-lg border bg-background">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 text-center font-semibold text-sm">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-2">
              <Button
                size="lg"
                variant={isAdded ? 'outline' : 'default'}
                disabled={isMutating || !currentVariant}
                onClick={handleAddToCart}
                className="flex-1 gap-2 font-semibold"
              >
                {isAdded ? (
                  <>
                    <Check className="h-5 w-5 text-emerald-600" />
                    <span>{t('addedToCart')}</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-5 w-5" />
                    <span>{t('addToCart')}</span>
                  </>
                )}
              </Button>

              <Button
                size="lg"
                variant="secondary"
                disabled={isMutating || !currentVariant}
                onClick={handleBuyNow}
                className="flex-1 font-semibold"
              >
                {t('buyNow')}
              </Button>
            </div>

            {/* Features Info Box */}
            <div className="rounded-xl border bg-muted/20 p-4 space-y-3 text-xs text-muted-foreground">
              {isDigital ? (
                <div className="flex items-center gap-2 text-foreground">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span>{t('digitalDeliveryNotice')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-foreground">
                  <Truck className="h-4 w-4 text-primary shrink-0" />
                  <span>{t('physicalDeliveryNotice')}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>{t('secureCheckoutNotice')}</span>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="space-y-2 pt-4 border-t">
                <h3 className="font-semibold text-base text-foreground">
                  {t('descriptionTitle')}
                </h3>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              </div>
            )}

            {/* Metadata (ISBN, Language, etc.) */}
            {isbn && (
              <div className="pt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">ISBN:</span> {isbn}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
