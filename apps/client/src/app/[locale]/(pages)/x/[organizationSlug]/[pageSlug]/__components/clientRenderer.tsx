'use client';
import { config } from '@/app/[locale]/(dashboard)/organization-dashboard/my-pages/__components/puck-editor';
import { IPage } from '@/lib/types/page/page.interface';
import { Render, type Config, type Data } from '@puckeditor/core';

function toPuckData(page: IPage): Data {
  const pd = page.pageData;
  if (pd && typeof pd === 'object' && 'content' in pd && 'root' in pd) {
    return pd as Data;
  }
  return {
    content: [],
    root: { props: { title: page.title || 'Page' } },
  };
}

export default function ClientRenderer({ page }: { page: IPage }) {
  return (
    <div>
      <Render config={config as unknown as Config} data={toPuckData(page)} />
    </div>
  );
}
