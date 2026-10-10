import CategoryDetailPage from '../__components/single-category-view';
import { getCategory } from '@/lib/actions/category/category.action';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import { notFound } from 'next/navigation';

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const categoryId = (await params).id;
  const category = await getCategory(categoryId);
  if (isNatsErrResult(category)) {
    notFound();
  }
  return (
    <div>
      <CategoryDetailPage categoryData={category} />
    </div>
  );
}
