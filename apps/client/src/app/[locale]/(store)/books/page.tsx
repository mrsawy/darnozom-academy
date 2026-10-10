'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Search,
  BookOpen,
  ShoppingBag,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getMedusaClient, type StoreProduct } from '@/lib/medusa-client';
import { useCart } from '@/lib/context/cart-context';

export default function BooksPage() {
  const t = useTranslations('store');
  const { addItem, isMutating } = useCart();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<'all' | 'paper' | 'digital'>('all');
  const [addedVariantId, setAddedVariantId] = useState<string | null>(null);

  // Fetch products from Medusa
  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<StoreProduct[]>({
    queryKey: ['medusa-products'],
    queryFn: async () => {
      const sdk = getMedusaClient();
      const response = await sdk.store.product.list({
        limit: 100,
        fields: '*variants,*variants.calculated_price,*variants.metadata,*categories,*tags',
      });
      return response.products || [];
    },
  });

  // Extract unique categories from products metadata/categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const metaCat = (p.metadata as Record<string, unknown> | undefined)?.category;
      if (typeof metaCat === 'string' && metaCat) {
        set.add(metaCat);
      }
      if (p.categories) {
        p.categories.forEach((c) => {
          if (c.name) set.add(c.name);
        });
      }
    });
    return Array.from(set);
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search filter
      const q = search.trim().toLowerCase();
      if (q) {
        const title = (p.title || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const subtitle = (p.subtitle || '').toLowerCase();
        const author = String(
          (p.metadata as Record<string, unknown> | undefined)?.author || ''
        ).toLowerCase();

        if (!title.includes(q) && !desc.includes(q) && !subtitle.includes(q) && !author.includes(q)) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all') {
        const metaCat = (p.metadata as Record<string, unknown> | undefined)?.category;
        const matchesCat =
          metaCat === selectedCategory ||
          p.categories?.some((c) => c.name === selectedCategory);
        if (!matchesCat) return false;
      }

      // Format filter
      if (selectedFormat !== 'all') {
        const hasFormat = p.variants?.some((v) => {
          const kind = (v.metadata as Record<string, unknown> | undefined)?.kind;
          const vTitle = (v.title || '').toLowerCase();
          if (selectedFormat === 'digital') {
            return kind === 'digital' || vTitle.includes('digital') || vTitle.includes('رقمي');
          }
          if (selectedFormat === 'paper') {
            return kind === 'paper' || vTitle.includes('paper') || vTitle.includes('ورقي');
          }
          return false;
        });
        if (!hasFormat) return false;
      }

      return true;
    });
  }, [products, search, selectedCategory, selectedFormat]);

  const handleQuickAdd = async (e: React.MouseEvent, product: StoreProduct) => {
    e.preventDefault();
    e.stopPropagation();
    const variant = product.variants?.[0];
    if (!variant?.id) return;

    try {
      await addItem(variant.id, 1);
      setAddedVariantId(variant.id);
      setTimeout(() => setAddedVariantId(null), 2000);
    } catch (err) {
      console.error('Quick add failed:', err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header Banner */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-muted p-6 sm:p-10">
        <div className="flex flex-col gap-3 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wide">
            <Sparkles className="h-4 w-4" />
            <span>{t('bannerEyebrow')}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            {t('title')}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="ps-9 h-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Format selector */}
          <div className="flex items-center rounded-lg border bg-muted/20 p-1 text-xs">
            <button
              onClick={() => setSelectedFormat('all')}
              className={`rounded px-3 py-1.5 font-medium transition-colors ${
                selectedFormat === 'all'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('formats.all')}
            </button>
            <button
              onClick={() => setSelectedFormat('paper')}
              className={`rounded px-3 py-1.5 font-medium transition-colors ${
                selectedFormat === 'paper'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('formats.paper')}
            </button>
            <button
              onClick={() => setSelectedFormat('digital')}
              className={`rounded px-3 py-1.5 font-medium transition-colors ${
                selectedFormat === 'digital'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('formats.digital')}
            </button>
          </div>

          {/* Category filter if categories exist */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
                className="text-xs h-8"
              >
                {t('allCategories')}
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="text-xs h-8 capitalize"
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-muted" />
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-3" />
          <h3 className="font-semibold text-lg mb-1">{t('errorTitle')}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t('errorMessage')}</p>
          <Button variant="outline" onClick={() => refetch()}>
            {t('retry')}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredProducts.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-lg mb-1">{t('emptyTitle')}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t('emptyMessage')}</p>
          {(search || selectedCategory !== 'all' || selectedFormat !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setSelectedFormat('all');
              }}
            >
              {t('clearFilters')}
            </Button>
          )}
        </div>
      )}

      {/* Product Grid */}
      {!isLoading && !isError && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const author = (product.metadata as Record<string, unknown> | undefined)?.author as
              | string
              | undefined;
            const category = (product.metadata as Record<string, unknown> | undefined)?.category as
              | string
              | undefined;

            // Determine formats available
            const hasPaper = product.variants?.some(
              (v) =>
                (v.metadata as Record<string, unknown> | undefined)?.kind === 'paper' ||
                v.title?.toLowerCase().includes('paper') ||
                v.title?.toLowerCase().includes('ورقي')
            );
            const hasDigital = product.variants?.some(
              (v) =>
                (v.metadata as Record<string, unknown> | undefined)?.kind === 'digital' ||
                v.title?.toLowerCase().includes('digital') ||
                v.title?.toLowerCase().includes('رقمي')
            );

            // Compute display price
            const firstVariant = product.variants?.[0];
            const priceAmount =
              firstVariant?.calculated_price?.calculated_amount ??
              (firstVariant as unknown as { prices?: Array<{ amount: number }> })?.prices?.[0]
                ?.amount ??
              0;
            const currencyCode = (
              firstVariant?.calculated_price?.currency_code ||
              'EGP'
            ).toUpperCase();

            const isItemAdded = firstVariant && addedVariantId === firstVariant.id;

            return (
              <Card
                key={product.id}
                className="group flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/40"
              >
                {/* Book Thumbnail */}
                <Link
                  href={`/books/${product.id}`}
                  className="relative aspect-[3/4] w-full bg-muted overflow-hidden flex items-center justify-center"
                >
                  {product.thumbnail ? (
                    <img
                      src={product.thumbnail}
                      alt={product.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground p-6 text-center">
                      <BookOpen className="h-12 w-12 stroke-[1.5]" />
                      <span className="text-xs font-medium line-clamp-2">{product.title}</span>
                    </div>
                  )}

                  {/* Format Badges */}
                  <div className="absolute top-2 start-2 flex flex-col gap-1">
                    {hasDigital && (
                      <Badge variant="info" className="text-[10px] py-0 px-1.5 shadow-xs">
                        {t('digitalPdf')}
                      </Badge>
                    )}
                    {hasPaper && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 shadow-xs">
                        {t('paper')}
                      </Badge>
                    )}
                  </div>
                </Link>

                {/* Book Info */}
                <CardContent className="flex flex-1 flex-col justify-between p-4 gap-3">
                  <div className="space-y-1.5">
                    {category && (
                      <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                        {category}
                      </span>
                    )}
                    <Link
                      href={`/books/${product.id}`}
                      className="block font-semibold text-sm line-clamp-2 hover:text-primary transition-colors"
                      title={product.title}
                    >
                      {product.title}
                    </Link>
                    {author && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{author}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-muted-foreground me-1">{t('from')}</span>
                      <span className="font-bold text-base text-foreground">
                        {priceAmount} {currencyCode}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant={isItemAdded ? 'outline' : 'default'}
                      disabled={isMutating || !firstVariant}
                      onClick={(e) => handleQuickAdd(e, product)}
                      className="h-8 px-2.5 text-xs gap-1.5"
                    >
                      {isItemAdded ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{t('added')}</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="h-3.5 w-3.5" />
                          <span>{t('addToCart')}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
