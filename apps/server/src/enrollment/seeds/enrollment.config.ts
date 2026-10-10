import { EnrollmentSeedConfig } from './enrollment-config.interface';
import { faker } from '@faker-js/faker';

export const ENROLLMENT_CONFIG: EnrollmentSeedConfig = {
  enrollments: [
    ...Array.from({ length: 24 }, () => ({
      progressPercentage: faker.number.int({ min: 15, max: 100 }),
    })),
    ...Array.from({ length: 8 }, () => ({
      progressPercentage: faker.number.int({ min: 0, max: 40 }),
    })),
  ],
};
