'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { useDisclaimerSeen } from '@/lib/hooks/ui/use-disclaimer-seen';
import type { DisclaimerId } from '@/lib/utils/disclaimers/disclaimer-storage';
import { cn } from '@/lib/utils';

export interface DisclaimerModalAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
}

export interface DisclaimerModalProps {
  /** Stable id used for localStorage when persistSeen is true. */
  disclaimerId: DisclaimerId;
  /** Scope seen-state per account when multiple users share a browser. */
  userId?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  /** Extra footer actions (e.g. navigate to create instructor). */
  actions?: DisclaimerModalAction[];
  /**
   * When true (default), remember dismissal in localStorage and auto-open once.
   * When false, use `open` / `onOpenChange` only — good for condition-based advisories.
   */
  persistSeen?: boolean;
  /** When true, skip the automatic first-visit open (e.g. another tour is active). */
  deferAutoOpen?: boolean;
  /** Controlled open for manual re-open or condition-based advisories. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, closing via overlay/Escape is ignored (use footer actions). */
  preventDismiss?: boolean;
  className?: string;
  contentClassName?: string;
}

/**
 * Reusable disclaimer dialog.
 * By default marks `disclaimerId` as seen in localStorage when closed.
 */
export function DisclaimerModal({
  disclaimerId,
  userId,
  title,
  description,
  children,
  confirmLabel,
  actions,
  persistSeen = true,
  deferAutoOpen = false,
  open: controlledOpen,
  onOpenChange,
  preventDismiss = false,
  className,
  contentClassName,
}: DisclaimerModalProps) {
  const { seen, markSeen, isReady } = useDisclaimerSeen(disclaimerId, userId);
  const [autoOpen, setAutoOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const dialogOpen = persistSeen
    ? (isControlled && controlledOpen) || autoOpen
    : Boolean(controlledOpen);

  useEffect(() => {
    if (!persistSeen) return;
    if (!isReady || seen || deferAutoOpen) {
      setAutoOpen(false);
      return;
    }
    setAutoOpen(true);
  }, [persistSeen, isReady, seen, deferAutoOpen]);

  const close = () => {
    if (preventDismiss && !confirmLabel && !(actions && actions.length > 0)) {
      return;
    }
    setAutoOpen(false);
    onOpenChange?.(false);
    if (persistSeen && !seen) {
      markSeen();
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (preventDismiss) return;
      close();
      return;
    }
    onOpenChange?.(true);
  };

  const footerActions: DisclaimerModalAction[] =
    actions && actions.length > 0
      ? actions
      : confirmLabel
        ? [{ label: confirmLabel, onClick: close }]
        : [];

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn('sm:max-w-2xl', contentClassName, className)}
        showCloseButton={!preventDismiss}
        onPointerDownOutside={preventDismiss ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={preventDismiss ? (e) => e.preventDefault() : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {children ? <div className="space-y-4 py-2">{children}</div> : null}

        {footerActions.length > 0 ? (
          <DialogFooter className="gap-2 sm:gap-2">
            {footerActions.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant={action.variant ?? 'default'}
                onClick={() => {
                  action.onClick();
                  if (persistSeen && !seen) {
                    markSeen();
                  }
                }}>
                {action.label}
              </Button>
            ))}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default DisclaimerModal;
