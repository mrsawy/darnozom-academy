import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './entities/role.entity';
import { RoleService } from './role.service';
import { RoleControllerMessage } from './controllers/message/role.controller.message';
import { CaslAbilityFactory } from './permissions.factory';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }])],
  controllers: [RoleControllerMessage],
  providers: [RoleService, CaslAbilityFactory, PermissionsGuard],
  exports: [RoleService, CaslAbilityFactory, PermissionsGuard, MongooseModule],
})
export class RoleModule {}
