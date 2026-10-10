'use client';

import { Button } from '@/components/atoms/button';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Download, LayoutDashboard, UserPlus } from 'lucide-react';
import useUserStore from '@/lib/store/userStore';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';
import { ROUTE_SIGNUP } from '@/lib/data/constants/routes.constants';
import { getHeroAudience } from './get-hero-audience';

function HeroActionButtons() {
  const t = useTranslations('Hero');
  const user = useUserStore((state) => state.user);

  if (user) {
    const audience = getHeroAudience(user.roleName);

    return (
      <ul className="mx-auto flex flex-wrap items-center justify-center gap-4 md:w-9/12">
        <li className="min-w-[200px] flex-1 sm:max-w-sm">
          <Link
            href={getDashboardUrl(user.roleName)}
            className="inline-flex w-full items-center justify-center rounded-md py-[14px] text-center text-base font-medium transition duration-300 ease-in-out">
            <Button
              className="default w-full rounded-xl px-2 md:text-lg"
              effect="expandIcon"
              icon={LayoutDashboard}
              iconPlacement="left"
              size="lg">
              {t(`welcome.${audience}.goToDashboard`)}
            </Button>
          </Link>
        </li>
      </ul>
    );
  }

  return (
    <ul className="mx-auto flex flex-wrap items-center justify-center gap-4 md:w-9/12">
      <li className="min-w-[120px] flex-1">
        <a
          href="#student-app"
          className="text-dark shadow-1 hover:bg-gray-2 inline-flex w-full items-center justify-center rounded-md py-[14px] text-center text-base font-medium transition duration-300 ease-in-out">
          <Button
            className="default w-full rounded-xl px-2 md:text-lg"
            effect="expandIcon"
            icon={Download}
            iconPlacement="left">
            {t('downloadStudentsApplicationNow')}
          </Button>
        </a>
      </li>
      <li className="min-w-[120px] flex-1">
        <Link
          href={ROUTE_SIGNUP}
          className="hover:text-dark flex w-full items-center gap-4 rounded-md py-[14px] text-base font-medium transition duration-300 ease-in-out">
          <Button
            className="w-full rounded-xl border px-2 text-white outline md:text-lg dark:text-black"
            effect="expandIcon"
            icon={UserPlus}
            iconPlacement="left">
            {t('createNewAccountNow')}
          </Button>
        </Link>
      </li>
    </ul>
  );
}

export default HeroActionButtons;
