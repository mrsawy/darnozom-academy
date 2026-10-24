import { useTranslations } from 'next-intl';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import CtaLink from '@/components/molecules/public-site/cta-link';
import {
  ANCHOR_HOME_CONTACT,
  ANCHOR_HOME_PRICING,
  ROUTE_CONTACT,
} from '@/lib/data/constants/routes.constants';

/** Closing terracotta band — the last ask before the footer. */
function HomeCtaSection() {
  const t = useTranslations('HomeCta');

  return (
    <section
      id={ANCHOR_HOME_CONTACT.slice(1)}
      className="bg-dz-paper mx-auto w-full max-w-[1240px] px-6 pb-16">
      <div className="bg-dz-terracotta text-dz-paper-raised grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-center gap-7 rounded-[28px] px-10 py-14">
        <DisplayHeading className="text-[clamp(1.75rem,3.4vw,2.625rem)] leading-[1.4]">
          {t('title')}
        </DisplayHeading>

        <div className="flex flex-wrap justify-end gap-3">
          <CtaLink href={ANCHOR_HOME_PRICING} variant="paper">
            {t('primary')}
          </CtaLink>
          <CtaLink href={ROUTE_CONTACT} variant="outlineOnDark">
            {t('secondary')}
          </CtaLink>
        </div>
      </div>
    </section>
  );
}

export default HomeCtaSection;
