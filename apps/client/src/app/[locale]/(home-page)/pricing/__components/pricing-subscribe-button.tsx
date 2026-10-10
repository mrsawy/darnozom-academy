'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/button';
import { IconLoader2 } from '@tabler/icons-react';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { PaymentProvider } from '@/lib/types/payment/payment.interface';
import { getSubscriptionLink } from '@/lib/actions/subscription/subscription.action';
import useUserStore from '@/lib/store/userStore';
import { AuthDialog } from '@/components/organs/auth-dialog/auth-dialog';

interface PricingSubscribeButtonProps {
  planId: string;
  billingCycle: BillingCycle;
  lemonSqueezyVariantId?: string;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'text' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

export default function PricingSubscribeButton({
  planId,
  billingCycle,
  lemonSqueezyVariantId,
  className,
  variant = 'default',
  size = 'default',
  children,
}: PricingSubscribeButtonProps) {
  const user = useUserStore((state) => state.user);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    if (!user?._id) {
      setIsAuthDialogOpen(true);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await getSubscriptionLink({
      planId,
      billingCycle,
      provider: PaymentProvider.LEMON_SQUEEZY,
      lemonSqueezyVariantId,
    });

    setLoading(false);

    if ('error' in response) {
      setError(response.error ?? 'Unknown error');
      return;
    }

    globalThis.open(response.url, '_blank');
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        className={className}
        variant={variant}
        size={size}
        onClick={() => void onClick()}
        disabled={loading}>
        {loading ? (
          <>
            <IconLoader2 className="size-4 animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <AuthDialog open={isAuthDialogOpen} onClose={() => setIsAuthDialogOpen(false)} />
    </div>
  );
}
