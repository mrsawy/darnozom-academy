import Image from 'next/image';
import { useTranslations } from 'next-intl';
import SectionShell from '@/components/molecules/public-site/section-shell';
import Eyebrow from '@/components/molecules/public-site/eyebrow';
import DisplayHeading from '@/components/molecules/public-site/display-heading';

const MISSION_IMAGE = '/images/home-section-cards/card1/1.jpg';

function AboutMissionSection() {
  const t = useTranslations('about.mission');

  return (
    <SectionShell
      tone="paper"
      innerClassName="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-14">
      <div className="bg-dz-sand border-dz-line relative aspect-5/4 w-full overflow-hidden rounded-[28px] border">
        <Image
          src={MISSION_IMAGE}
          alt={t('imageAlt')}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 600px"
        />
      </div>

      <div className="flex flex-col gap-5">
        <Eyebrow>{t('badge')}</Eyebrow>
        <DisplayHeading>{t('title')}</DisplayHeading>
        <p className="text-dz-ink-soft m-0 text-[17px] text-pretty">{t('description1')}</p>
      </div>
    </SectionShell>
  );
}

export default AboutMissionSection;
