'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/button';
import { getSubscriptionLink } from '@/lib/actions/subscription/subscription.action';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { PaymentProvider } from '@/lib/types/payment/payment.interface';
import { IconLoader2 } from '@tabler/icons-react';

interface SubscribePlanButtonProps {
  planId: string;
  organizationId: string;
  billingCycle?: BillingCycle;
  provider?: PaymentProvider;
  /** Lemon Squeezy variant ID for this plan + cycle. Only used when provider is LEMON_SQUEEZY. */
  lemonSqueezyVariantId?: string;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'text' | 'link';
  children?: React.ReactNode;
}

export function SubscribePlanButton({
  planId,
  organizationId: _organizationId,
  billingCycle = BillingCycle.MONTHLY,
  provider = PaymentProvider.PAYMOB,
  lemonSqueezyVariantId,
  className,
  variant = 'default',
  children = 'Subscribe',
}: SubscribePlanButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    const result = await getSubscriptionLink({
      planId,
      billingCycle,
      provider,
      ...(provider === PaymentProvider.LEMON_SQUEEZY && lemonSqueezyVariantId != null
        ? { lemonSqueezyVariantId }
        : {}),
    });
    setLoading(false);

    if ('error' in result) {
      setError(result.error ?? 'Unknown error');
      return;
    }

    if ('url' in result) {
      globalThis.open(result.url, '_blank');
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant={variant}
        onClick={() => void handleClick()}
        disabled={loading}
        className={className}>
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
    </div>
  );
}
