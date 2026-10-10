import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/actions/user/user.action';
import { ROUTE_LOGIN } from '@/lib/data/constants/routes.constants';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) {
    redirect(ROUTE_LOGIN);
  }
  return <div className="bg-background">{children}</div>;
}
