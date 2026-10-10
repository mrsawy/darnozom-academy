import type { CSSProperties } from 'react';
import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  textField,
  textareaField,
  colorField,
  radioField,
  selectField,
  linkField,
} from '../utils';
import type { PricingSectionProps, PricingPlan } from './types';
import { useTranslations } from 'next-intl';

const PricingSection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      backgroundColor: colorField(),
      titleColor: colorField(),
      accentColor: colorField(),
      billingToggle: radioField([
        { label: 'Show', value: 'yes' },
        { label: 'Hide', value: 'no' },
      ]),
      style: selectField([
        { label: 'Classic Cards', value: 'classic' },
        { label: 'Modern Gradient', value: 'gradient' },
        { label: 'Minimal', value: 'minimal' },
        { label: 'Bold Highlight', value: 'bold' },
      ]),
      alignment: selectField([
        { label: 'Horizontal (side by side)', value: 'horizontal' },
        { label: 'Stacked (single column)', value: 'stacked' },
      ]),
      buttonText: textField(true),
      showPopularBadge: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      plans: {
        type: 'array' as const,
        arrayFields: {
          name: textField(true),
          price: textField(true),
          period: textField(true),
          description: textareaField(true),
          features: { type: 'textarea' as const },
          highlighted: radioField([
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
          ]),
          badge: textField(true),
          buttonLink: linkField(),
          customButtonText: textField(true),
          accentColor: colorField(),
        },
      },
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Choose Your Plan',
      subtitle: 'Flexible pricing for every learner. Start free, upgrade anytime.',
      backgroundColor: '#ffffff',
      titleColor: '#111827',
      accentColor: '#7c3aed',
      billingToggle: 'yes',
      style: 'classic',
      alignment: 'horizontal',
      buttonText: 'Get Started',
      showPopularBadge: 'yes',
      plans: [
        {
          name: 'Basic',
          price: '$0',
          period: 'month',
          description: 'Perfect for trying out our platform',
          features: '5 courses access\nBasic support\nCommunity forum access\nMobile app access',
          highlighted: 'no',
          badge: 'Free Forever',
          buttonLink: '#',
          customButtonText: '',
          accentColor: '#6b7280',
        },
        {
          name: 'Pro',
          price: '$29',
          period: 'month',
          description: 'Best for serious learners',
          features:
            'Unlimited course access\nPriority support 24/7\nCertificates of completion\nOffline video download\nExclusive webinars\nCareer guidance',
          highlighted: 'yes',
          badge: 'Most Popular',
          buttonLink: '#',
          customButtonText: 'Start Free Trial',
          accentColor: '#7c3aed',
        },
        {
          name: 'Enterprise',
          price: '$99',
          period: 'month',
          description: 'For teams and organizations',
          features:
            'Everything in Pro\nTeam management tools\nCustom integrations\nDedicated account manager\nAdvanced analytics\nCustom branding\nAPI access',
          highlighted: 'no',
          badge: 'Best Value',
          buttonLink: '#',
          customButtonText: 'Contact Sales',
          accentColor: '#1f2937',
        },
      ],
    },
    render: function PricingSectionRender({
      title,
      subtitle,
      backgroundColor,
      titleColor,
      accentColor,
      billingToggle,
      style,
      alignment,
      buttonText,
      showPopularBadge,
      plans,
      ...props
    }: PricingSectionProps) {
      const t = useTranslations('MyPagesSections');

      const styleProps = getStyleProps(props);
      const plansArray: PricingPlan[] = Array.isArray(plans) ? plans : [];
      const primaryColor = accentColor ?? '#7c3aed';

      const cardBase =
        {
          classic:
            'bg-white rounded-2xl border-2 border-gray-100 hover:border-purple-200 hover:shadow-xl transition-all duration-300',
          gradient:
            'rounded-2xl border-2 border-transparent hover:shadow-xl transition-all duration-300',
          minimal: 'bg-white rounded-xl border-l-4 hover:shadow-md transition-all duration-300',
          bold: 'bg-white rounded-2xl shadow-md hover:-translate-y-1 hover:shadow-2xl transition-all duration-300',
        }[style ?? 'classic'] ?? 'bg-white rounded-2xl border-2 border-gray-100';

      return (
        <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="mb-14 text-center">
              <h2
                className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl"
                style={{ color: titleColor }}>
                {title}
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-gray-500">{subtitle}</p>
            </div>

            {/* Billing toggle */}
            {billingToggle === 'yes' && (
              <div className="mb-12 flex items-center justify-center gap-4">
                <span className="font-semibold text-gray-600">{t('monthly')}</span>
                <div className="relative h-7 w-14 cursor-pointer rounded-full bg-gray-200 transition-colors">
                  <div className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform" />
                </div>
                <span className="font-semibold text-gray-600">
                  {t('yearly')}{' '}
                  <span className="ml-1 rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-bold text-green-700">
                    {t('saveTwentyPercent')}
                  </span>
                </span>
              </div>
            )}

            {/* Plans grid */}
            <div
              className={`grid grid-cols-1 gap-8 ${alignment === 'horizontal' ? 'lg:grid-cols-3' : 'mx-auto max-w-md'}`}>
              {plansArray.map((plan, idx) => {
                const isHighlighted = plan.highlighted === 'yes';
                const planAccent = plan.accentColor ?? primaryColor;

                const gradientStyle =
                  style === 'gradient'
                    ? {
                        background: isHighlighted
                          ? `linear-gradient(135deg, ${planAccent}15 0%, #4f46e510 100%)`
                          : '#f9fafb',
                      }
                    : {};
                const minimalStyle = style === 'minimal' ? { borderLeftColor: planAccent } : {};

                return (
                  <div
                    key={idx}
                    className={`relative ${cardBase} ${isHighlighted ? 'z-10 scale-[1.03] shadow-2xl ring-2' : ''}`}
                    style={{
                      ...gradientStyle,
                      ...minimalStyle,
                      ...(isHighlighted
                        ? ({ '--tw-ring-color': planAccent } as CSSProperties)
                        : {}),
                    }}>
                    {/* Highlighted ring */}
                    {isHighlighted ? (
                      <div
                        className="absolute inset-0 rounded-2xl ring-2"
                        style={{ '--tw-ring-color': planAccent } as CSSProperties}
                      />
                    ) : null}

                    {/* Badge */}
                    {showPopularBadge === 'yes' && plan.badge ? (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <div
                          className="rounded-full px-5 py-1 text-sm font-bold text-white shadow-lg"
                          style={{ backgroundColor: planAccent }}>
                          {plan.badge}
                        </div>
                      </div>
                    ) : null}

                    <div className="p-8">
                      <div className="mb-6">
                        <h3 className="mb-1 text-2xl font-extrabold text-gray-900">{plan.name}</h3>
                        <p className="min-h-[40px] text-sm text-gray-500">{plan.description}</p>
                      </div>

                      <div className="mb-8 flex items-end gap-1">
                        <span
                          className="text-5xl leading-none font-extrabold tracking-tight"
                          style={{ color: planAccent }}>
                          {plan.price}
                        </span>
                        <span className="mb-1 text-gray-400">/{plan.period}</span>
                      </div>

                      <ul className="mb-8 space-y-3">
                        {plan.features
                          ? plan.features
                              .split('\n')
                              .filter(Boolean)
                              .map((feature, fIdx) => (
                                <li key={fIdx} className="flex items-start gap-3">
                                  <span
                                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                    style={{ backgroundColor: planAccent }}>
                                    ✓
                                  </span>
                                  <span className="text-sm text-gray-700">{feature}</span>
                                </li>
                              ))
                          : null}
                      </ul>

                      <a
                        href={plan.buttonLink ?? '#'}
                        className={`block w-full rounded-xl py-3 text-center text-sm font-bold transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${isHighlighted ? 'text-white shadow-lg' : 'text-gray-700 hover:text-white'}`}
                        style={
                          isHighlighted
                            ? { backgroundColor: planAccent }
                            : { backgroundColor: `${planAccent}15`, color: planAccent }
                        }>
                        {plan.customButtonText?.trim() ? plan.customButtonText.trim() : buttonText}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer note */}
            <div className="mt-14 text-center">
              <p className="mb-2 text-sm text-gray-500">{t('pricingGuarantees')}</p>
              <p className="text-sm text-gray-400">
                {t('haveQuestions')}{' '}
                <a
                  href="#contact"
                  className="font-semibold hover:underline"
                  style={{ color: primaryColor }}>
                  {t('talkToUs')}
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    },
  };
};

export default PricingSection;
