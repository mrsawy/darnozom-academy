import { useTranslations } from 'next-intl';
import SectionShell from '@/components/molecules/public-site/section-shell';
import DisplayHeading from '@/components/molecules/public-site/display-heading';

const TESTIMONIAL_INDEXES = [0, 1, 2] as const;

function AboutTestimonialsSection() {
  const t = useTranslations('about.testimonials');

  return (
    <SectionShell tone="paper" innerClassName="flex flex-col gap-10">
      <div className="flex max-w-[760px] flex-col gap-2.5">
        <DisplayHeading>{t('title')}</DisplayHeading>
        <p className="text-dz-ink-soft m-0 text-[17px] text-pretty">{t('description')}</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5">
        {TESTIMONIAL_INDEXES.map((index) => (
          <figure
            key={index}
            className="bg-dz-paper-raised border-dz-line m-0 flex flex-col gap-5 rounded-3xl border p-7">
            <span className="font-display text-dz-tan text-5xl leading-none" aria-hidden>
              &ldquo;
            </span>
            <blockquote className="text-dz-ink m-0 text-[17px] leading-relaxed">
              {t(`items.${index}.quote`)}
            </blockquote>
            <figcaption className="border-dz-line mt-auto border-t pt-4">
              <div className="font-semibold">{t(`items.${index}.author`)}</div>
              <div className="text-dz-ink-soft text-sm">{t(`items.${index}.role`)}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </SectionShell>
  );
}

export default AboutTestimonialsSection;
