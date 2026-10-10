'use client';

import { useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';
import type { Data } from '@puckeditor/core';
import { IPage } from '@/lib/types/page/page.interface';
import { usePageBySlug } from '@/lib/hooks/page/page.hook';
import PuckEditor from './puck-editor';
import PuckEditorSkeleton from './puck-editor.skeleton';
import { ROUTE_ORG_MY_PAGES } from '@/lib/data/constants/routes.constants';
import { useTranslations } from 'next-intl';

interface PageEditorClientProps {
  slug: string;
}

const toPuckData = (page: IPage): Data => {
  const raw = page.pageData;
  if (
    raw &&
    typeof raw === 'object' &&
    'content' in raw &&
    'root' in raw &&
    Array.isArray((raw as { content: unknown }).content)
  ) {
    return raw as Data;
  }
  return {
    content: [],
    root: { props: { title: page.title || 'My Landing Page' } },
  };
};

export default function PageEditorClient({ slug }: PageEditorClientProps) {
  const t = useTranslations('MyPagesSections');
  const router = useRouter();
  const { data, isLoading, isError, error } = usePageBySlug(slug);

  useEffect(() => {
    if (isError) {
      router.replace(ROUTE_ORG_MY_PAGES);
    }
  }, [isError, router]);

  if (isLoading || !data) {
    return <PuckEditorSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-6 text-center">
        <div>
          <p className="mb-2 text-lg font-semibold">{t('pageNotFound')}</p>
          <p className="text-sm opacity-70">{error?.message ?? t('redirecting')}</p>
        </div>
      </div>
    );
  }

  return <PuckEditor slug={slug} initialData={toPuckData(data)} />;
}
