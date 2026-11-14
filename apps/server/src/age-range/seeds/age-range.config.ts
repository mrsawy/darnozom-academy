export interface AgeRangeSeedEntry {
  nameEn: string;
  nameAr: string;
  minAge: number;
  maxAge: number | null;
}

/** Default age ranges. Seeded idempotently by `nameEn`. */
export const AGE_RANGE_SEED_DEFINITIONS: AgeRangeSeedEntry[] = [
  { nameEn: '3-5 years', nameAr: '٣-٥ سنوات', minAge: 3, maxAge: 5 },
  { nameEn: '6-8 years', nameAr: '٦-٨ سنوات', minAge: 6, maxAge: 8 },
  { nameEn: '9-12 years', nameAr: '٩-١٢ سنة', minAge: 9, maxAge: 12 },
  { nameEn: '13-17 years', nameAr: '١٣-١٧ سنة', minAge: 13, maxAge: 17 },
  { nameEn: '18+ years', nameAr: '١٨ سنة فأكثر', minAge: 18, maxAge: null },
];
