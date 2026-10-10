import * as yup from 'yup';

export interface GradeFormValues {
  nameEn: string;
  nameAr: string;
}

export function buildGradeFormSchema(tVal: (key: string) => string) {
  return yup.object({
    nameEn: yup.string().trim().required(tVal('nameEnRequired')),
    nameAr: yup.string().trim().required(tVal('nameArRequired')),
  });
}
