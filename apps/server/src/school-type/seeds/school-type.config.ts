export interface SchoolTypeSeedEntry {
  nameEn: string;
  nameAr: string;
}

/** Common Egyptian school types. Seeded idempotently by `nameEn`. */
export const SCHOOL_TYPE_SEED_DEFINITIONS: SchoolTypeSeedEntry[] = [
  { nameEn: 'Public', nameAr: 'حكومي' },
  { nameEn: 'Private', nameAr: 'خاص' },
  { nameEn: 'Language', nameAr: 'لغات' },
  { nameEn: 'International', nameAr: 'دولي' },
  { nameEn: 'Azhar', nameAr: 'أزهري' },
];
