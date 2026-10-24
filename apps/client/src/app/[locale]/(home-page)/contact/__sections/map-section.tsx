import { useTranslations } from 'next-intl';

function ContactMapSection() {
  const t = useTranslations('contact.map');

  return (
    <section className="bg-dz-paper mx-auto w-full max-w-[1240px] px-6 pb-20 md:pb-24">
      <div className="bg-dz-sand border-dz-line relative h-[420px] w-full overflow-hidden rounded-[28px] border md:h-[520px]">
        <iframe
          src={t('embedUrl')}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0"
          title={t('title')}
          sandbox="allow-scripts allow-popups"
        />
      </div>
    </section>
  );
}

export default ContactMapSection;
