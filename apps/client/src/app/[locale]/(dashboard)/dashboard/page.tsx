import { getAuthUser } from '@/lib/actions/user/user.action';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';
import { redirect } from 'next/navigation';

async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login');
  }
  const role = user.roleName;
  const dashboardUrl = getDashboardUrl(role);
  return redirect(dashboardUrl);
}

export default DashboardPage;
