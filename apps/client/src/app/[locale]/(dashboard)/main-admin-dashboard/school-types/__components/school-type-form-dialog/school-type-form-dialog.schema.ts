import * as yup from 'yup';

export interface SchoolTypeFormValues {
  nameEn: string;
  nameAr: string;
}

export function buildSchoolTypeFormSchema(tVal: (key: string) => string) {
  return yup.object({
    nameEn: yup.string().trim().required(tVal('nameEnRequired')),
    nameAr: yup.string().trim().required(tVal('nameArRequired')),
  });
}
