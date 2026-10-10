import PageEditorClient from '../../__components/page-editor-client';

export default async function SinglePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PageEditorClient slug={slug} />;
}
