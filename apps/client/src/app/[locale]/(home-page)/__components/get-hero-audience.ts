import { Roles } from '@lms-organization/shared-types';

export type HeroAudience = 'student' | 'parent' | 'organization';

export function getHeroAudience(roleName: Roles): HeroAudience {
  switch (roleName) {
    case Roles.STUDENT: {
      return 'student';
    }
    case Roles.PARENT: {
      return 'parent';
    }
    default: {
      return 'organization';
    }
  }
}
