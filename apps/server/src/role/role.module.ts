import { forwardRef, Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { RoleControllerMessage } from './controllers/message/role.controller.message';
import { CaslAbilityFactory } from './permissions.factory';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './entities/role.entity';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [RoleController, RoleControllerMessage],
  providers: [RoleService, CaslAbilityFactory],
  exports: [CaslAbilityFactory, RoleService],
})
export class RoleModule {}
