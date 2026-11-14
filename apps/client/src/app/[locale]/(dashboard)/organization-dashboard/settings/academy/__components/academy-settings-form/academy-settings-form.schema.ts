import * as yup from 'yup';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Messages are i18n keys under `AcademySettings.validation`; the form translates them. */
export const academySettingsSchema = yup.object({
  name: yup.string().trim().required('nameRequired').max(120, 'nameTooLong'),
  description: yup.string().trim().max(1000, 'descriptionTooLong').default(''),
  themeId: yup.string().required(),
  primaryColor: yup.string().required().matches(HEX_COLOR, 'invalidColor'),
  secondaryColor: yup.string().required().matches(HEX_COLOR, 'invalidColor'),
});

export type AcademySettingsFormValues = yup.InferType<typeof academySettingsSchema>;
