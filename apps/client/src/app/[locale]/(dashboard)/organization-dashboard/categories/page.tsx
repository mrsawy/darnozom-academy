import CategoriesDataTable from './__components/category-data-table';
import { getAuthUser } from '@/lib/actions/user/user.action';

export default async function CategoriesPage() {
  const user = await getAuthUser();
  if (!user?.organizationId) {
    throw new Error('Organization is not defined');
  }
  return (
    <div>
      {/* <div>
                <h1>Categories</h1>
                <div className='flex flex-row'>
                    <Link href="/category/create" className='ms-auto'>
                        <Button><IconPlus /> Add New</Button>
                    </Link>
                </div>
            </div> */}
      <CategoriesDataTable organizationId={user?.organizationId} />
    </div>
  );
}
