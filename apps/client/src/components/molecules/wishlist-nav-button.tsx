'use client';
import { Heart } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Badge } from '@/components/atoms/badge';
import { WishlistDrawer } from '@/components/organs/wishlist-drawer';
import { useWishlist } from '@/lib/hooks/wishlist/use-wishlist.hook';
import { usePathname } from '@/i18n/navigation';
import useUserStore from '@/lib/store/userStore';
import { isLocaleRootPathname } from '@/lib/utils/routes/is-locale-root-pathname';
import { useTranslations } from 'next-intl';

export default function WishlistNavButton() {
  const t = useTranslations('WishlistNavButton');
  const pathname = usePathname();
  const user = useUserStore((s) => s.user);
  const isMarketingHome = isLocaleRootPathname(pathname);
  const { data: wishlistData } = useWishlist({}, 10, { enabled: !user || !isMarketingHome });
  // Get total count from first page
  const count = wishlistData?.pages[0]?.totalDocs ?? 0;

  return (
    <WishlistDrawer>
      <Button
        variant="ghost"
        size="icon"
        className="group relative h-9 w-9 hover:bg-transparent hover:text-white"
        aria-label={t('wishlist')}>
        <Heart className="h-5 w-5 transition-all group-hover:fill-red-500 group-hover:text-red-500" />
        {count > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center p-0 text-xs font-semibold">
            {count > 99 ? '99+' : count}
          </Badge>
        )}
      </Button>
    </WishlistDrawer>
  );
}
