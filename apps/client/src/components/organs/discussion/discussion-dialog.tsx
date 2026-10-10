'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/atoms/sheet';
import { DiscussionSection } from './discussion-section';
import { DiscussionType } from '@/lib/types/discussion/discussion.types';
import { useTranslations } from 'next-intl';

interface DiscussionDialogProps {
  type?: DiscussionType;
  courseId: string;
  moduleId?: string;
  contentId?: string;
  entityTitle?: string;
  canDeleteAny?: boolean;
}

const TITLE_KEY: Record<DiscussionType, string> = {
  [DiscussionType.COURSE]: 'courseDiscussions',
  [DiscussionType.MODULE]: 'moduleDiscussions',
  [DiscussionType.CONTENT]: 'contentDiscussions',
};

const DESC_KEY: Record<DiscussionType, string> = {
  [DiscussionType.COURSE]: 'discussionsForCourse',
  [DiscussionType.MODULE]: 'discussionsForModule',
  [DiscussionType.CONTENT]: 'discussionsForContent',
};

export function DiscussionDialog({
  type = DiscussionType.CONTENT,
  courseId,
  moduleId,
  contentId,
  entityTitle,
  canDeleteAny,
}: DiscussionDialogProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('Discussion');

  const sheetTitle = t(TITLE_KEY[type]);
  const sheetDesc = entityTitle ?? t(DESC_KEY[type]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => setOpen(true)}
        title={t('viewDiscussions')}>
        <MessageSquare className="h-4 w-4" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription>{sheetDesc}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {open ? (
              <DiscussionSection
                type={type}
                entityId={courseId}
                courseId={courseId}
                moduleId={moduleId}
                contentId={contentId}
                canDeleteAny={canDeleteAny}
                defaultOpen
                title={sheetTitle}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
