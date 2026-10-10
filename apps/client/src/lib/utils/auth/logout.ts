import { logout as logoutAction } from '@/lib/actions/auth/auth.action';
import { useRouter } from '@/i18n/navigation';
import useUserStore from '@/lib/store/userStore';
import { ROUTE_LOGIN } from '@/lib/data/constants/routes.constants';

export default function useLogout() {
  const router = useRouter();
  const { clearUser } = useUserStore();

  const handleLogout = async () => {
    clearUser();
    try {
      await logoutAction();
    } catch (error) {
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        router.push(ROUTE_LOGIN);
      }
    }
  };

  return { handleLogout };
}
