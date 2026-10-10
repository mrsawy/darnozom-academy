import { Suspense } from 'react';
import { ChatClient } from './__components/chat-client';
import { ROUTE_LOGIN } from '@/lib/data/constants/routes.constants';
import { getAuthUser } from '@/lib/actions/user/user.action';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';
import { redirect } from '@/i18n/navigation';

export interface DashboardChatPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ with?: string; conversation?: string }>;
}

function buildRoleChatPath(dashboardUrl: string, search: { with?: string; conversation?: string }) {
  const qs = new URLSearchParams();
  if (search.with) qs.set('with', search.with);
  if (search.conversation) qs.set('conversation', search.conversation);
  const query = qs.toString();
  return query ? `/${dashboardUrl}/chat?${query}` : `/${dashboardUrl}/chat`;
}

export async function ChatPage({ searchParams }: Pick<DashboardChatPageProps, 'searchParams'>) {
  const params = await searchParams;
  return (
    <Suspense>
      <ChatClient initialWithUserId={params.with} initialConversationId={params.conversation} />
    </Suspense>
  );
}

/** `/chat` — send authenticated users to their role dashboard chat; preserve query string. */
export default async function RoleDashboardChatRedirect({
  searchParams,
  params,
}: DashboardChatPageProps) {
  const { locale } = await params;
  const search = await searchParams;
  const user = await getAuthUser();
  if (!user) {
    redirect({
      href: ROUTE_LOGIN,
      locale,
    });
  }
  const dashboardUrl = getDashboardUrl(user?.roleName);
  return redirect({
    href: buildRoleChatPath(dashboardUrl, search),
    locale,
  });
}
