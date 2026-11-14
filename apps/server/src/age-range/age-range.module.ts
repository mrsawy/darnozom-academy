import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';
import { Course, CourseSchema } from '../course/entities/course.entity';
import { AgeRange, AgeRangeSchema } from './entities/age-range.entity';
import { AgeRangeService } from './age-range.service';
import { AgeRangeController } from './age-range.controller';
import { AgeRangeControllerMessage } from './controller/age-range.controller.message';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AgeRange.name, schema: AgeRangeSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  controllers: [AgeRangeController, AgeRangeControllerMessage],
  providers: [AgeRangeService, PlatformAdminGuard],
  exports: [AgeRangeService],
})
export class AgeRangeModule {}
