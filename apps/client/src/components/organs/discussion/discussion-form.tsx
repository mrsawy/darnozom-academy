'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/button';
import { Textarea } from '@/components/atoms/textarea';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DiscussionFormProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  initialContent?: string;
  placeholder?: string;
  submitLabel?: string;
  isReply?: boolean;
}

export function DiscussionForm({
  onSubmit,
  onCancel,
  initialContent = '',
  placeholder,
  submitLabel,
  isReply = false,
}: DiscussionFormProps) {
  const t = useTranslations('StudentCourses.discussion.form');
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayPlaceholder = placeholder ?? t('defaultPlaceholder');
  const displaySubmitLabel = submitLabel ?? t('defaultSubmit');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      onSubmit(content.trim());
      setContent('');
    } catch (error) {
      // Error handling - could be improved with toast notification
      // eslint-disable-next-line no-console
      console.error('Failed to submit discussion:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className={`space-y-3 ${isReply ? 'ml-8' : ''}`}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={displayPlaceholder}
        className="min-h-[100px] resize-none"
        disabled={isSubmitting}
      />
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}>
            {t('cancel')}
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={isSubmitting || !content.trim()}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {displaySubmitLabel}
        </Button>
      </div>
    </form>
  );
}
