'use client';

import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Clock, Loader2, Mail, MapPin, Phone, Send, Share2 } from 'lucide-react';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/atoms/field';
import SectionShell from '@/components/molecules/public-site/section-shell';
import Eyebrow from '@/components/molecules/public-site/eyebrow';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import { API_PATH_CONTACT } from '@/lib/data/constants/routes.constants';
import SocialMedia from '../../__components/social-media';
import {
  CONTACT_FORM_DEFAULTS,
  createContactFormSchema,
  type ContactFormData,
} from './contact-form-section.schema';

function ContactFormSection() {
  const t = useTranslations('contact.form');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: yupResolver(createContactFormSchema(t)),
    defaultValues: CONTACT_FORM_DEFAULTS,
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      const response = await fetch(API_PATH_CONTACT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? t('error'));

      toast.success(t('success'));
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('error'));
    }
  };

  return (
    <SectionShell
      tone="paper"
      innerClassName="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-14">
      <div className="flex flex-col gap-5">
        <Eyebrow>{t('socialLabel')}</Eyebrow>
        <DisplayHeading>{t('infoTitle')}</DisplayHeading>
        <p className="text-dz-ink-soft m-0 text-[17px] text-pretty">{t('infoDescription')}</p>

        <div className="border-dz-line flex flex-col border-t">
          <div className="border-dz-line flex gap-4 border-b py-5">
            <Phone className="text-dz-terracotta mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <div className="font-semibold">{t('phoneLabel')}</div>
              <a
                href={`tel:${t('phone1')}`}
                dir="ltr"
                className="text-dz-ink-soft hover:text-dz-terracotta block text-start text-sm transition-colors">
                {t('phone1')}
              </a>
              <a
                href={`tel:${t('phone2')}`}
                dir="ltr"
                className="text-dz-ink-soft hover:text-dz-terracotta block text-start text-sm transition-colors">
                {t('phone2')}
              </a>
            </div>
          </div>

          <div className="border-dz-line flex gap-4 border-b py-5">
            <Mail className="text-dz-terracotta mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <div className="font-semibold">{t('emailLabel')}</div>
              <a
                href={`mailto:${t('email1')}`}
                dir="ltr"
                className="text-dz-ink-soft hover:text-dz-terracotta block text-start text-sm break-words transition-colors">
                {t('email1')}
              </a>
            </div>
          </div>

          <div className="border-dz-line flex gap-4 border-b py-5">
            <MapPin className="text-dz-terracotta mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <div className="font-semibold">{t('addressLabel')}</div>
              <p className="text-dz-ink-soft m-0 text-sm">{t('address')}</p>
            </div>
          </div>

          <div className="border-dz-line flex gap-4 border-b py-5">
            <Clock className="text-dz-terracotta mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <div className="font-semibold">{t('hoursLabel')}</div>
              <p className="text-dz-ink-soft m-0 text-sm">{t('hours')}</p>
            </div>
          </div>

          <div className="flex gap-4 py-5">
            <Share2 className="text-dz-terracotta mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <div className="mb-2 font-semibold">{t('socialLabel')}</div>
              <SocialMedia />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-dz-paper-raised border-dz-line rounded-3xl border p-8">
        <DisplayHeading as="h3" scale="card">
          {t('title')}
        </DisplayHeading>
        <p className="text-dz-ink-soft mt-2 mb-6">{t('description')}</p>

        <form
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          className="flex flex-col gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={!!errors.firstName}>
              <FieldLabel htmlFor="firstName">{t('fields.firstName')}</FieldLabel>
              <FieldContent>
                <Input
                  id="firstName"
                  type="text"
                  {...register('firstName')}
                  placeholder={t('placeholders.firstName')}
                  aria-invalid={!!errors.firstName}
                />
                <FieldError errors={errors.firstName ? [errors.firstName] : []} />
              </FieldContent>
            </Field>

            <Field data-invalid={!!errors.lastName}>
              <FieldLabel htmlFor="lastName">{t('fields.lastName')}</FieldLabel>
              <FieldContent>
                <Input
                  id="lastName"
                  type="text"
                  {...register('lastName')}
                  placeholder={t('placeholders.lastName')}
                  aria-invalid={!!errors.lastName}
                />
                <FieldError errors={errors.lastName ? [errors.lastName] : []} />
              </FieldContent>
            </Field>
          </div>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">{t('fields.email')}</FieldLabel>
            <FieldContent>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder={t('placeholders.email')}
                aria-invalid={!!errors.email}
              />
              <FieldError errors={errors.email ? [errors.email] : []} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.subject}>
            <FieldLabel htmlFor="subject">{t('fields.subject')}</FieldLabel>
            <FieldContent>
              <Input
                id="subject"
                type="text"
                {...register('subject')}
                placeholder={t('placeholders.subject')}
                aria-invalid={!!errors.subject}
              />
              <FieldError errors={errors.subject ? [errors.subject] : []} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.message}>
            <FieldLabel htmlFor="message">{t('fields.message')}</FieldLabel>
            <FieldContent>
              <Textarea
                id="message"
                {...register('message')}
                placeholder={t('placeholders.message')}
                rows={6}
                className="resize-none"
                aria-invalid={!!errors.message}
              />
              <FieldError errors={errors.message ? [errors.message] : []} />
            </FieldContent>
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-dz-terracotta text-dz-paper-raised hover:bg-dz-terracotta-deep inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-full px-6.5 py-3.5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70">
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </SectionShell>
  );
}

export default ContactFormSection;
