'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/button';
import { IconLoader2 } from '@tabler/icons-react';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { PaymentProvider } from '@/lib/types/payment/payment.interface';
import { getAiSubscriptionLink } from '@/lib/actions/ai-subscription/ai-subscription.action';
import { AuthDialog } from '@/components/organs/auth-dialog/auth-dialog';
import useUserStore from '@/lib/store/userStore';
import { AiSubscriptionTargetModal } from './ai-subscription-target-modal';

interface AiSubscribeButtonProps {
  aiPlanId: string;
  billingCycle: BillingCycle;
  lemonSqueezyVariantId?: string;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'text' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
  /** When true, shows a child-selector modal before checkout (parent flow). */
  isParent?: boolean;
}

export function AiSubscribeButton({
  aiPlanId,
  billingCycle,
  lemonSqueezyVariantId,
  className,
  variant = 'default',
  size = 'default',
  children,
  isParent,
}: AiSubscribeButtonProps) {
  const user = useUserStore((state) => state.user);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateCheckout = async (childUserId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAiSubscriptionLink({
        aiPlanId,
        billingCycle,
        provider: PaymentProvider.LEMON_SQUEEZY,
        lemonSqueezyVariantId,
        ...(childUserId ? { childUserId } : {}),
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      globalThis.open(result.url, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate payment link');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (!user?._id) {
      setIsAuthDialogOpen(true);
      return;
    }
    if (isParent) {
      setIsTargetModalOpen(true);
      return;
    }
    void initiateCheckout();
  };

  const handleTargetConfirm = (targetUserId: string | null) => {
    setIsTargetModalOpen(false);
    void initiateCheckout(targetUserId ?? undefined);
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        className={className}
        variant={variant}
        size={size}
        onClick={handleClick}
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

      {isParent && user?._id ? (
        <AiSubscriptionTargetModal
          open={isTargetModalOpen}
          onOpenChange={setIsTargetModalOpen}
          onConfirm={handleTargetConfirm}
          currentUserId={user._id}
          isLoading={loading}
        />
      ) : null}
    </div>
  );
}
