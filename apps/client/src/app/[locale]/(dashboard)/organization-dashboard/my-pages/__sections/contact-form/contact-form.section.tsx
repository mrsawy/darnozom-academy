/* eslint-disable @next/next/no-img-element */
import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  selectField,
  textField,
  textareaField,
  colorField,
  colorFields,
  imageField,
  arrayField,
  linkField,
} from '../utils';
import type { ContactFormField, ContactFormSectionProps } from './types';

/** Safely derive an input name from a label. */
function fieldInputName(label: unknown, idx: number): string {
  if (typeof label === 'string' && label.trim()) {
    return label.toLowerCase().replaceAll(/\s+/g, '_');
  }
  return `field_${idx}`;
}

const ContactFormSection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      description: textareaField(true),
      submitLabel: textField(true),
      submitUrl: linkField(),
      layout: selectField([
        { label: 'Split (Info + Form)', value: 'split' },
        { label: 'Single Column', value: 'single' },
        { label: 'Minimal (form only)', value: 'minimal' },
      ]),
      formStyle: selectField([
        { label: 'Card (white bg)', value: 'card' },
        { label: 'Flat (no shadow)', value: 'flat' },
        { label: 'Bordered', value: 'bordered' },
      ]),
      sideImage: imageField,
      ...colorFields,
      accentColor: colorField(),
      fields: arrayField({
        label: textField(true),
        placeholder: textField(true),
        type: selectField([
          { label: 'Text', value: 'text' },
          { label: 'Email', value: 'email' },
          { label: 'Phone', value: 'tel' },
          { label: 'Textarea', value: 'textarea' },
          { label: 'Number', value: 'number' },
        ]),
        required: selectField([
          { label: 'Required', value: 'yes' },
          { label: 'Optional', value: 'no' },
        ]),
      }),
      infoTitle: textField(true),
      infoEmail: textField(true),
      infoPhone: textField(true),
      infoAddress: textField(true),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Get in Touch',
      description:
        'Have questions? We would love to hear from you — fill in the form and our team will respond within 24 hours.',
      submitLabel: 'Send Message',
      submitUrl: '#',
      layout: 'split',
      formStyle: 'card',
      sideImage: '',
      backgroundColor: '#f9fafb',
      textColor: '#111827',
      accentColor: '#7c3aed',
      fields: [
        { label: 'Your Name', placeholder: 'Jane Doe', type: 'text', required: 'yes' },
        { label: 'Email Address', placeholder: 'you@example.com', type: 'email', required: 'yes' },
        { label: 'Phone Number', placeholder: '+1 555 000 1111', type: 'tel', required: 'no' },
        {
          label: 'Message',
          placeholder: 'How can we help you today?',
          type: 'textarea',
          required: 'yes',
        },
      ],
      infoTitle: 'Contact Information',
      infoEmail: 'hello@example.com',
      infoPhone: '+1 (555) 000-1111',
      infoAddress: '123 Learning Street, Education City',
    },
    render: ({
      title,
      description,
      submitLabel,
      submitUrl,
      layout,
      formStyle,
      sideImage,
      backgroundColor,
      textColor,
      accentColor,
      fields,
      infoTitle,
      infoEmail,
      infoPhone,
      infoAddress,
      ...props
    }: ContactFormSectionProps) => {
      const styleProps = getStyleProps(props);
      const primary = accentColor ?? '#7c3aed';
      const list = Array.isArray(fields) ? fields : [];

      const inputClass =
        'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none';

      const formCardClass =
        {
          card: 'rounded-2xl bg-white p-8 shadow-xl',
          flat: 'rounded-2xl bg-white p-8',
          bordered:
            'rounded-2xl border-2 border-gray-100 bg-white p-8 hover:border-purple-200 transition-colors',
        }[formStyle ?? 'card'] ?? 'rounded-2xl bg-white p-8 shadow-xl';

      const formEl = (
        <form action={submitUrl ?? '#'} method="post" className={formCardClass}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {list.map((f: ContactFormField, idx: number) => (
              <div key={idx} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                {f.label ? (
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    {f.label}
                    {f.required === 'yes' && <span className="ml-1 text-red-400">*</span>}
                  </label>
                ) : null}
                {f.type === 'textarea' ? (
                  <textarea
                    name={fieldInputName(f.label, idx)}
                    placeholder={f.placeholder}
                    required={f.required === 'yes'}
                    rows={4}
                    className={inputClass}
                  />
                ) : (
                  <input
                    type={f.type ?? 'text'}
                    name={fieldInputName(f.label, idx)}
                    placeholder={f.placeholder}
                    required={f.required === 'yes'}
                    className={inputClass}
                  />
                )}
              </div>
            ))}
          </div>
          <button
            type="submit"
            className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl"
            style={{ backgroundColor: primary }}>
            {submitLabel}
          </button>
        </form>
      );

      if (layout === 'minimal') {
        return (
          <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
            <div className="mx-auto max-w-2xl">
              {title || description ? (
                <div className="mb-10 text-center">
                  {title ? (
                    <h2
                      className="mb-3 text-4xl font-extrabold tracking-tight"
                      style={{ color: textColor }}>
                      {title}
                    </h2>
                  ) : null}
                  {description ? <p className="text-lg text-gray-500">{description}</p> : null}
                </div>
              ) : null}
              {formEl}
            </div>
          </div>
        );
      }

      if (layout === 'single') {
        return (
          <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
            <div className="mx-auto max-w-3xl">
              <div className="mb-10 text-center">
                {title ? (
                  <h2
                    className="mb-3 text-4xl font-extrabold tracking-tight md:text-5xl"
                    style={{ color: textColor }}>
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p className="mx-auto max-w-xl text-lg text-gray-500">{description}</p>
                ) : null}
              </div>
              {formEl}
            </div>
          </div>
        );
      }

      // Split (default)
      return (
        <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
              {/* Left info panel */}
              <div style={{ color: textColor }}>
                {title ? (
                  <h2 className="mb-4 text-4xl leading-tight font-extrabold tracking-tight md:text-5xl">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p className="mb-8 text-lg leading-relaxed text-gray-500">{description}</p>
                ) : null}

                {sideImage ? (
                  <img
                    src={sideImage}
                    alt=""
                    className="mb-8 w-full rounded-2xl object-cover shadow-xl"
                  />
                ) : null}

                <div className="rounded-2xl bg-white p-6 shadow-md">
                  {infoTitle ? (
                    <h3 className="mb-5 text-xl font-extrabold text-gray-900">{infoTitle}</h3>
                  ) : null}
                  <ul className="space-y-4 text-sm">
                    {infoEmail ? (
                      <li className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-full text-base"
                          style={{ backgroundColor: `${primary}15`, color: primary }}>
                          ✉
                        </span>
                        <a
                          href={`mailto:${infoEmail}`}
                          className="font-medium text-gray-700 hover:underline">
                          {infoEmail}
                        </a>
                      </li>
                    ) : null}
                    {infoPhone ? (
                      <li className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-full text-base"
                          style={{ backgroundColor: `${primary}15`, color: primary }}>
                          ☎
                        </span>
                        <a
                          href={`tel:${infoPhone}`}
                          className="font-medium text-gray-700 hover:underline">
                          {infoPhone}
                        </a>
                      </li>
                    ) : null}
                    {infoAddress ? (
                      <li className="flex items-start gap-3">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                          style={{ backgroundColor: `${primary}15`, color: primary }}>
                          📍
                        </span>
                        <span className="leading-relaxed font-medium text-gray-700">
                          {infoAddress}
                        </span>
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>

              {/* Right form */}
              {formEl}
            </div>
          </div>
        </div>
      );
    },
  };
};

export default ContactFormSection;
