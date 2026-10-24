import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { contactEmail, phoneNumbers } from '@/data/footer.config';
import { Link } from '@/i18n/navigation';
import SocialMedia from '@/app/[locale]/(home-page)/contact/__components/social-media';
import { LOGO_URL } from '@/lib/data/constants';
import {
  ROUTE_ABOUT,
  ROUTE_HOME,
  ROUTE_AI_PRICING,
  ROUTE_BOOKS,
  ROUTE_CONTACT,
  ROUTE_COURSES,
  ROUTE_INSTRUCTORS,
  ROUTE_PRICING,
  ROUTE_PRIVACY,
  ROUTE_RETURN_POLICY,
  ROUTE_TERMS,
} from '@/lib/data/constants/routes.constants';

interface FooterColumn {
  headingKey: 'platform' | 'company';
  links: { href: string; labelKey: string }[];
}

/** `labelKey` resolves inside the `Navbar.links` namespace, which already carries every page name. */
const FOOTER_COLUMNS: FooterColumn[] = [
  {
    headingKey: 'platform',
    links: [
      { href: ROUTE_COURSES, labelKey: 'courses' },
      { href: ROUTE_INSTRUCTORS, labelKey: 'instructors' },
      { href: ROUTE_BOOKS, labelKey: 'books' },
      { href: ROUTE_PRICING, labelKey: 'pricing' },
      { href: ROUTE_AI_PRICING, labelKey: 'aiPricing' },
    ],
  },
  {
    headingKey: 'company',
    links: [
      { href: ROUTE_ABOUT, labelKey: 'aboutUs' },
      { href: ROUTE_CONTACT, labelKey: 'contact' },
      { href: ROUTE_PRIVACY, labelKey: 'privacy' },
      { href: ROUTE_TERMS, labelKey: 'terms' },
      { href: ROUTE_RETURN_POLICY, labelKey: 'returnPolicy' },
    ],
  },
];

function Footer() {
  const t = useTranslations('footer');
  const tLinks = useTranslations('Navbar.links');

  return (
    <footer className="bg-dz-paper text-dz-ink border-dz-line border-t">
      <div className="mx-auto grid w-full max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-8 px-6 pt-12 pb-8">
        <div className="flex flex-col gap-3">
          <Link href={ROUTE_HOME} className="text-dz-ink flex items-center gap-2.5">
            <Image
              src={LOGO_URL}
              alt={t('title')}
              width={28}
              height={28}
              className="size-7 object-contain"
            />
            <span className="font-display text-[22px] font-bold">{t('title')}</span>
          </Link>
          <p className="text-dz-ink-soft m-0 text-sm">{t('description')}</p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.headingKey} className="flex flex-col gap-2 text-sm">
            <div className="mb-1 font-semibold">{t(column.headingKey)}</div>
            {column.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-dz-ink-soft hover:text-dz-terracotta transition-colors">
                {tLinks(link.labelKey)}
              </Link>
            ))}
          </div>
        ))}

        <div className="flex flex-col gap-2 text-sm">
          <div className="mb-1 font-semibold">{t('contact')}</div>
          {phoneNumbers.map((phone) => (
            <a
              key={phone}
              href={`https://wa.me/${phone}`}
              target="_blank"
              rel="noopener noreferrer"
              dir="ltr"
              className="text-dz-ink-soft hover:text-dz-terracotta text-start transition-colors">
              {phone}
            </a>
          ))}
          <a
            href={`mailto:${contactEmail}`}
            dir="ltr"
            className="text-dz-ink-soft hover:text-dz-terracotta text-start transition-colors">
            {contactEmail}
          </a>
          <div className="mt-2">
            <SocialMedia />
          </div>
        </div>
      </div>

      <div className="border-dz-line text-dz-ink-soft mx-auto w-full max-w-[1240px] border-t px-6 pt-4.5 pb-8 text-[13px]">
        © {new Date().getFullYear()} {t('copyright')}
      </div>
    </footer>
  );
}

export default Footer;
