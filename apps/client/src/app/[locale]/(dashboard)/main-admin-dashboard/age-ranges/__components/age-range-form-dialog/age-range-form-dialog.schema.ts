import * as yup from 'yup';

export interface AgeRangeFormValues {
  nameEn: string;
  nameAr: string;
  minAge: number;
  /** null = open-ended (e.g. 18+). */
  maxAge: number | null;
}

const emptyToNull = (value: unknown, original: unknown) => (original === '' || original === null || original === undefined ? null : value);

export function buildAgeRangeFormSchema(tVal: (key: string) => string) {
  return yup.object({
    nameEn: yup.string().trim().required(tVal('nameEnRequired')),
    nameAr: yup.string().trim().required(tVal('nameArRequired')),
    minAge: yup
      .number()
      .typeError(tVal('minAgeRequired'))
      .integer(tVal('ageInteger'))
      .min(0, tVal('ageMin'))
      .max(120, tVal('ageMax'))
      .required(tVal('minAgeRequired')),
    maxAge: yup
      .number()
      .transform(emptyToNull)
      .nullable()
      .integer(tVal('ageInteger'))
      .min(0, tVal('ageMin'))
      .max(120, tVal('ageMax'))
      .test('max-gte-min', tVal('maxAgeBelowMin'), function (value) {
        return value === null || value === undefined || value >= (this.parent as { minAge: number }).minAge;
      })
      .default(null),
  });
}
