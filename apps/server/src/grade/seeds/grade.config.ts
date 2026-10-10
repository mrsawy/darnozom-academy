export interface GradeSeedEntry {
  nameEn: string;
  nameAr: string;
}

/** Egyptian preparatory + secondary grades. Seeded idempotently by `nameEn`. */
export const GRADE_SEED_DEFINITIONS: GradeSeedEntry[] = [
  { nameEn: '1st Preparatory', nameAr: 'الصف الأول الإعدادي' },
  { nameEn: '2nd Preparatory', nameAr: 'الصف الثاني الإعدادي' },
  { nameEn: '3rd Preparatory', nameAr: 'الصف الثالث الإعدادي' },
  { nameEn: '1st Secondary', nameAr: 'الصف الأول الثانوي' },
  { nameEn: '2nd Secondary', nameAr: 'الصف الثاني الثانوي' },
  { nameEn: '3rd Secondary', nameAr: 'الصف الثالث الثانوي' },
];
