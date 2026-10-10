import { NatsContext } from '@nestjs/microservices';
import { UserDocument } from 'src/user/entities/user.entity';
import { AppAbility } from 'src/role/permissions.factory';

export interface IUserContext extends NatsContext {
  userPayload: UserDocument & { ability: AppAbility };
  /** Set by PermissionsGuard when permission checks pass; use for condition checks in handlers */
  userAbility?: AppAbility;
}
