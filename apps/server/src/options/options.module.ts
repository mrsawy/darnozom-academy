import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OptionsService } from './options.service';
import { OptionsController } from './options.controller';
import { OptionsControllerMessage } from './options.controller.message';
import { Option, OptionSchema } from './entities/option.entity';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';

@Module({
  imports: [MongooseModule.forFeature([{ name: Option.name, schema: OptionSchema }]), forwardRef(() => AuthModule), RoleModule],
  controllers: [OptionsController, OptionsControllerMessage],
  providers: [OptionsService, PlatformAdminGuard],
  exports: [OptionsService],
})
export class OptionsModule {}
