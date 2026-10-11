import { Roles } from '@darnozom/shared-types';
import { IUserContext } from 'src/utils/types/IUserContext.interface';

export interface AcademicsActor {
  _id: string;
  organizationId: string;
  roleName: Roles;
  additionalRoles: Roles[];
}

export function actorFromContext(context: IUserContext): AcademicsActor {
  const user = context.userPayload;
  return {
    _id: String(user._id),
    organizationId: user.organizationId ? String(user.organizationId) : '',
    roleName: user.roleName,
    additionalRoles: (user as { additionalRoles?: Roles[] }).additionalRoles ?? [],
  };
}
