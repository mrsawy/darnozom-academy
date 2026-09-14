import { NatsContext } from '@nestjs/microservices';
import { UserDocument } from '../../user/entities/user.entity';
import { AppAbility } from '../../role/permissions.factory';

export interface IUserContext extends NatsContext {
  userPayload: UserDocument & { ability: AppAbility };
  /** Set by PermissionsGuard when permission checks pass; use for condition checks in handlers */
  userAbility?: AppAbility;
}
