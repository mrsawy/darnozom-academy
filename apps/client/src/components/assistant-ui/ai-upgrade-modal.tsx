'use client';

import { useTranslations } from 'next-intl';
import { SparklesIcon, CheckIcon, MessageCircleIcon, Loader2Icon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Badge } from '@/components/atoms/badge';
import { useQuery } from '@/lib/utils';
import { getAiPlans } from '@/lib/actions/ai-plan/ai-plan.action';
import type { AiPlanResponse } from '@/lib/actions/ai-plan/ai-plan.action';

export type AiUpgradeReason = 'dailyLimit' | 'noSubscription' | 'expired' | 'featureNotIncluded';

interface AiUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: AiUpgradeReason;
}

interface AiPlanCardProps {
  plan: AiPlanResponse;
}

function AiPlanCard({ plan }: AiPlanCardProps) {
  const t = useTranslations('AiUpgradeModal');

  const monthlyPrice = plan.price?.MONTHLY?.priceUSD ?? 0;
  const isUnlimitedMessages = plan.features.messagesPerDay === -1;

  return (
    <div className="bg-card relative flex flex-col gap-3 rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base leading-tight font-semibold">{plan.name}</h3>
          {plan.tier ? (
            <Badge variant="outline" className="mt-1 text-xs capitalize">
              {plan.tier}
            </Badge>
          ) : null}
        </div>
        <div className="shrink-0 text-end">
          {monthlyPrice === 0 ? (
            <span className="text-2xl font-bold">{t('free')}</span>
          ) : (
            <>
              <span className="text-2xl font-bold">${monthlyPrice}</span>
              <span className="text-muted-foreground text-xs">{t('perMonth')}</span>
            </>
          )}
        </div>
      </div>

      {plan.description ? (
        <p className="text-muted-foreground text-xs leading-relaxed">{plan.description}</p>
      ) : null}

      <ul className="space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          <CheckIcon className="text-primary size-3.5 shrink-0" />
          {isUnlimitedMessages ? (
            <span>{t('unlimitedMessages')}</span>
          ) : (
            <span>{t('messagesPerDay', { count: plan.features.messagesPerDay })}</span>
          )}
        </li>
        {plan.features.aiAssistant ? (
          <li className="flex items-center gap-2">
            <CheckIcon className="text-primary size-3.5 shrink-0" />
            <span>{t('aiAssistantIncluded')}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export function AiUpgradeModal({ open, onClose, reason = 'dailyLimit' }: AiUpgradeModalProps) {
  const t = useTranslations('AiUpgradeModal');

  const { data: plans, isLoading } = useQuery<AiPlanResponse[]>({
    queryKey: ['ai-plans-user'],
    queryFn: getAiPlans,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const activePlans = plans?.filter((p) => p.isActive) ?? [];

  const descriptionKey = {
    dailyLimit: 'limitReachedDescription',
    noSubscription: 'noSubscriptionDescription',
    expired: 'expiredDescription',
    featureNotIncluded: 'featureNotIncluded',
  } satisfies Record<AiUpgradeReason, string>;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="text-primary size-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t(descriptionKey[reason])}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-10">
              <Loader2Icon className="size-5 animate-spin" />
              <span className="text-sm">{t('loadingPlans')}</span>
            </div>
          ) : activePlans.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <MessageCircleIcon className="text-muted-foreground/40 size-10" />
              <p className="text-muted-foreground text-sm">{t('noPlansAvailable')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activePlans.map((plan) => (
                <AiPlanCard key={plan._id} plan={plan} />
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('close')}
          </Button>
          <Button
            onClick={() => {
              window.open('mailto:support@example.com', '_blank');
            }}>
            {t('contactSupport')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
