import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';
import { Course, CourseSchema } from '../course/entities/course.entity';
import { SchoolType, SchoolTypeSchema } from './entities/school-type.entity';
import { SchoolTypeService } from './school-type.service';
import { SchoolTypeController } from './school-type.controller';
import { SchoolTypeControllerMessage } from './controller/school-type.controller.message';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SchoolType.name, schema: SchoolTypeSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  controllers: [SchoolTypeController, SchoolTypeControllerMessage],
  providers: [SchoolTypeService, PlatformAdminGuard],
  exports: [SchoolTypeService],
})
export class SchoolTypeModule {}
