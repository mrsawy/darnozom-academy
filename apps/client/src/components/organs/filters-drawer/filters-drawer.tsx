'use client';

import { ReactNode, useCallback } from 'react';
import { ArrowRightIcon, X } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/atoms/sheet';

interface FiltersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  applyLabel: string;
  resetLabel: string;
  onApply: () => void;
  onReset: () => void;
  children: ReactNode;
}

/** Popovers / comboboxes render in a portal under `body`, so the sheet treats them as “outside” and closes. */
function isInsidePortaledOverlayContent(el: HTMLElement): boolean {
  return Boolean(
    el.closest('[data-slot="popover-content"]') ??
      el.closest('[data-radix-popper-content-wrapper]') ??
      el.closest('[data-radix-select-content]')
  );
}

function eventTouchesPortaledOverlay(event: Event): boolean {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [event.target];
  for (const node of path) {
    if (node instanceof HTMLElement && isInsidePortaledOverlayContent(node)) {
      return true;
    }
  }
  return false;
}

function FiltersDrawer({
  open,
  onOpenChange,
  title,
  description,
  applyLabel,
  resetLabel,
  onApply,
  onReset,
  children,
}: FiltersDrawerProps) {
  const handlePointerDownOutside = useCallback((event: Event) => {
    if (eventTouchesPortaledOverlay(event)) {
      event.preventDefault();
    }
  }, []);

  const handleFocusOutside = useCallback((event: Event) => {
    const focusEvent = event as FocusEvent;
    if (
      eventTouchesPortaledOverlay(event) ||
      (focusEvent.relatedTarget instanceof HTMLElement &&
        isInsidePortaledOverlayContent(focusEvent.relatedTarget))
    ) {
      event.preventDefault();
    }
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="w-full overflow-hidden p-0 sm:max-w-xl"
        onPointerDownOutside={handlePointerDownOutside}
        onFocusOutside={handleFocusOutside}
        onInteractOutside={handlePointerDownOutside}>
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>

        <div className="h-[calc(100%-140px)] overflow-y-auto px-6 py-5">{children}</div>

        <SheetFooter className="border-t px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            onClick={onReset}
            variant="outline"
            type="button"
            effect="expandIcon"
            icon={<X />}
            iconPlacement="right">
            {resetLabel}
          </Button>
          <Button
            onClick={onApply}
            variant="default"
            type="button"
            effect="expandIcon"
            icon={ArrowRightIcon}
            iconPlacement="right">
            {applyLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default FiltersDrawer;
