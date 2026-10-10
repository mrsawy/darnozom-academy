import { Mail, Phone } from 'lucide-react';
import Logo from '../atoms/logo';
import { useLocale, useTranslations } from 'next-intl';
import { contactEmail, pageLinks, phoneNumbers } from '@/data/footer.config';
import { Link } from '@/i18n/navigation';
import SocialMedia from '@/app/[locale]/(home-page)/contact/__components/social-media';
type Lang = 'en' | 'ar';

function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale() as Lang;

  return (
    <footer className="bg-card border-border mt-0 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Logo & Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-primary hover:text-primary/90 flex cursor-pointer items-center space-x-2 transition-colors">
                <div className="me-2 text-2xl">
                  <Logo />
                </div>
                <span className="hidden font-sans text-xl font-bold sm:inline-block">
                  {t('title')}
                </span>
              </Link>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">{t('description')}</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-foreground mb-4 font-semibold">{t('links')}</h3>
            <ul className="space-y-3">
              {pageLinks.map((link) => (
                <li key={link.name[locale]}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary text-sm transition-colors">
                    {link.name[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-foreground mb-4 font-semibold">{t('contact')}</h3>
            <div className="space-y-3">
              {phoneNumbers.map((link) => (
                <Link
                  key={link}
                  href={`https://wa.me/${link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary flex items-center gap-2 text-sm transition-colors">
                  <Phone className="h-4 w-4" />
                  <span className="dir-ltr">{link}</span>
                </Link>
              ))}
              <a
                href={`mailto:${contactEmail}`}
                className="text-muted-foreground hover:text-primary flex items-center gap-2 text-sm transition-colors">
                <Mail className="h-4 w-4" />
                <span className="dir-ltr">{contactEmail}</span>
              </a>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-foreground mb-4 font-semibold">{t('social')}</h3>
            <SocialMedia />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-border mt-8 flex flex-col items-center justify-between gap-4 border-t pt-8 text-center sm:flex-row">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} {t('copyright')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-primary transition-colors">
              {locale === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
            </Link>
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-primary transition-colors">
              {locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </Link>
            <Link
              href="/return-policy"
              className="text-muted-foreground hover:text-primary transition-colors">
              {locale === 'ar' ? 'سياسة الإرجاع' : 'Return Policy'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
