'use client';

import { useTranslations } from 'next-intl';

function ContactMapSection() {
  const t = useTranslations('contact.map');

  return (
    <section className="bg-background py-0">
      <div className="relative h-[500px] w-full overflow-hidden md:h-[600px]">
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
