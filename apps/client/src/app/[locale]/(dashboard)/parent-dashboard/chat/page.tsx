import { ChatPage, type DashboardChatPageProps } from '../../chat/page';

export default function Page({ searchParams }: Pick<DashboardChatPageProps, 'searchParams'>) {
  return <ChatPage searchParams={searchParams} />;
}
