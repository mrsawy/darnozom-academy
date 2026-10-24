import Image from 'next/image';
import { useTranslations } from 'next-intl';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import CtaLink from '@/components/molecules/public-site/cta-link';
import {
  ANCHOR_HOME_TOP,
  ROUTE_CONTACT,
  ROUTE_PRICING,
} from '@/lib/data/constants/routes.constants';

const ABOUT_IMAGE = '/images/home-section-cards/card3/3.jpg';

function AboutHeroSection() {
  const t = useTranslations('about.hero');

  return (
    <section
      id={ANCHOR_HOME_TOP.slice(1)}
      className="bg-dz-paper text-dz-ink mx-auto grid w-full max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-14 px-6 pt-18 pb-14">
      <div className="flex flex-col gap-6">
        <span className="bg-dz-sand text-dz-terracotta self-start rounded-full px-3.5 py-1.5 text-[13px] font-semibold">
          {t('numberOneMultiTenantSolution')}
        </span>

        <DisplayHeading as="h1" scale="hero">
          {t('title')}
        </DisplayHeading>

        <p className="text-dz-ink-soft m-0 max-w-[540px] text-lg text-pretty">{t('description')}</p>

        <div className="flex flex-wrap gap-3">
          <CtaLink href={ROUTE_PRICING} variant="terracotta">
            {t('learnMore')}
          </CtaLink>
          <CtaLink href={ROUTE_CONTACT} variant="outline">
            {t('contactUs')}
          </CtaLink>
        </div>
      </div>

      <div className="bg-dz-sand border-dz-line relative aspect-5/4 w-full overflow-hidden rounded-[28px] border">
        <Image
          src={ABOUT_IMAGE}
          alt={t('teamImageAlt')}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 600px"
          priority
        />
      </div>
    </section>
  );
}

export default AboutHeroSection;
