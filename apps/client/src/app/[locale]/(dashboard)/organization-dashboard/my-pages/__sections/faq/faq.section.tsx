import { useState } from 'react';
import {
  styleFields,
  defaultStyleProps,
  textField,
  textareaField,
  linkField,
  colorField,
  radioField,
  selectField,
  arrayField,
} from '../utils';
import type { FAQSectionProps, FAQItem } from './types';
import { useTranslations } from 'next-intl';

function FAQSectionRender({
  title,
  subtitle,
  backgroundColor,
  titleColor,
  accentColor,
  layout,
  style,
  showIcons,
  showCategories,
  openByDefault,
  contactText,
  contactLink,
  faqs,
}: FAQSectionProps) {
  const t = useTranslations('MyPagesSections');

  const [openIndex, setOpenIndex] = useState<number | null>(openByDefault === 'first' ? 0 : null);

  const primary = accentColor ?? '#7c3aed';
  const allOpen = openByDefault === 'all';
  const faqsArr: FAQItem[] = Array.isArray(faqs) ? faqs : [];

  const categories: string[] =
    showCategories === 'yes'
      ? [...new Set(faqsArr.map((f) => f.category).filter(Boolean) as string[])]
      : [];

  const itemClass =
    {
      modern: 'bg-white rounded-xl shadow-sm hover:shadow-md',
      classic: 'bg-white rounded-lg border border-gray-200',
      minimal: 'border-b border-gray-200',
      bold: 'rounded-xl border border-purple-100 bg-purple-50/50',
    }[style ?? 'modern'] ?? 'bg-white rounded-xl shadow-sm';

  function renderFAQ(faq: FAQItem, idx: number) {
    const isOpen = allOpen || openIndex === idx;

    return (
      <div key={idx} className={`overflow-hidden transition-all duration-300 ${itemClass}`}>
        <button
          type="button"
          onClick={() => !allOpen && setOpenIndex(isOpen ? null : idx)}
          className="group flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-black/2 sm:p-6">
          <div className="flex flex-1 items-start gap-3">
            {showIcons === 'yes' && faq.icon ? (
              <span className="mt-0.5 shrink-0 text-xl leading-none">{faq.icon}</span>
            ) : null}
            <div className="flex-1">
              {showCategories === 'yes' && faq.category ? (
                <span
                  className="mb-1 block text-xs font-bold tracking-widest uppercase"
                  style={{ color: primary }}>
                  {faq.category}
                </span>
              ) : null}
              <span className="text-base font-bold text-gray-900 sm:text-lg">{faq.question}</span>
            </div>
          </div>
          <span
            className={`mt-0.5 shrink-0 text-xl leading-none font-light transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}
            style={{ color: primary }}>
            +
          </span>
        </button>

        <div
          className="overflow-hidden transition-all duration-300"
          style={{ maxHeight: isOpen ? '600px' : '0' }}>
          <div className="px-5 pb-5 text-gray-600 sm:px-6 sm:pb-6">
            <div className={showIcons === 'yes' && faq.icon ? 'pl-7' : ''}>{faq.answer}</div>
          </div>
        </div>
      </div>
    );
  }

  const contactBtn = contactText ? (
    <div className="mt-12 text-center">
      <a
        href={contactLink ?? '#'}
        className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        style={{ backgroundColor: primary }}>
        {contactText} →
      </a>
    </div>
  ) : null;

  if (layout === 'sidebar') {
    return (
      <div className="px-6 py-20 sm:px-10" style={{ backgroundColor }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2
              className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl"
              style={{ color: titleColor }}>
              {title}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-500">{subtitle}</p>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <div className="sticky top-6 rounded-2xl bg-white p-6 shadow-lg">
                <h3 className="mb-4 text-lg font-extrabold text-gray-900">{t('categories')}</h3>
                <ul className="space-y-1">
                  {categories.map((cat, idx) => (
                    <li key={idx}>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-600 transition-colors hover:bg-purple-50 hover:text-purple-700">
                        {cat}
                      </button>
                    </li>
                  ))}
                </ul>
                {contactText ? (
                  <div className="mt-6 border-t border-gray-100 pt-5">
                    <a
                      href={contactLink ?? '#'}
                      className="block rounded-full px-4 py-2.5 text-center text-sm font-bold text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: primary }}>
                      {contactText}
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-3 lg:col-span-3">{faqsArr.map(renderFAQ)}</div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'two') {
    const half = Math.ceil(faqsArr.length / 2);
    return (
      <div className="px-6 py-20 sm:px-10" style={{ backgroundColor }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2
              className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl"
              style={{ color: titleColor }}>
              {title}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-500">{subtitle}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">{faqsArr.slice(0, half).map(renderFAQ)}</div>
            <div className="space-y-3">
              {faqsArr.slice(half).map((f, i) => renderFAQ(f, i + half))}
            </div>
          </div>
          {contactBtn}
        </div>
      </div>
    );
  }

  // Single (default)
  return (
    <div className="px-6 py-20 sm:px-10" style={{ backgroundColor }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-14 text-center">
          <h2
            className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl"
            style={{ color: titleColor }}>
            {title}
          </h2>
          <p className="text-lg text-gray-500">{subtitle}</p>
        </div>
        <div className="space-y-3">{faqsArr.map(renderFAQ)}</div>
        {contactBtn}
      </div>
    </div>
  );
}

function FAQSection() {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      backgroundColor: colorField(),
      titleColor: colorField(),
      accentColor: colorField(),
      layout: selectField([
        { label: 'Single Column', value: 'single' },
        { label: 'Two Columns', value: 'two' },
        { label: 'With Sidebar', value: 'sidebar' },
      ]),
      style: selectField([
        { label: 'Modern (shadow)', value: 'modern' },
        { label: 'Classic (border)', value: 'classic' },
        { label: 'Minimal (line)', value: 'minimal' },
        { label: 'Bold (tinted)', value: 'bold' },
      ]),
      showIcons: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      showCategories: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      openByDefault: radioField([
        { label: 'First Item', value: 'first' },
        { label: 'None', value: 'none' },
        { label: 'All', value: 'all' },
      ]),
      contactText: textField(true),
      contactLink: linkField(),
      faqs: arrayField({
        question: textField(true),
        answer: textareaField(true),
        category: textField(true),
        icon: textField(true),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Frequently Asked Questions',
      subtitle:
        "Everything you need to know about our platform. Can't find what you're looking for? Contact our support team.",
      backgroundColor: '#fafafa',
      titleColor: '#111827',
      accentColor: '#7c3aed',
      layout: 'single',
      style: 'modern',
      showIcons: 'yes',
      showCategories: 'yes',
      openByDefault: 'first',
      contactText: 'Still have questions? Contact us',
      contactLink: '#',
      faqs: [
        {
          question: 'How do I enroll in a course?',
          answer:
            'Simply browse our course catalog, select the course you want, and click the enroll button. You can start learning immediately after enrollment. All course materials are available 24/7.',
          category: 'Getting Started',
          icon: '📚',
        },
        {
          question: 'Can I get a refund?',
          answer:
            "Yes, we offer a 30-day money-back guarantee on all courses. If you're not satisfied, simply contact our support team within 30 days for a full refund.",
          category: 'Billing',
          icon: '💰',
        },
        {
          question: 'Do I receive a certificate upon completion?',
          answer:
            'Yes! All paid courses include a certificate of completion. Once you finish all course materials and pass the final assessment, your certificate will be automatically generated and available for download.',
          category: 'Certificates',
          icon: '🎓',
        },
        {
          question: 'Can I access courses on mobile devices?',
          answer:
            'Absolutely! Our platform is fully responsive and we also offer dedicated mobile apps for iOS and Android. You can learn on any device, anytime, anywhere.',
          category: 'Access',
          icon: '📱',
        },
        {
          question: 'Is there a free trial available?',
          answer:
            "Yes, we offer a 7-day free trial for our Pro plan. No credit card required. You'll have full access to all features during the trial period.",
          category: 'Getting Started',
          icon: '🆓',
        },
      ],
    },
    render: FAQSectionRender,
  };
}

export default FAQSection;
