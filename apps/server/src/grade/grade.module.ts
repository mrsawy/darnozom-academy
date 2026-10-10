import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';
import { Course, CourseSchema } from '../course/entities/course.entity';
import { Grade, GradeSchema } from './entities/grade.entity';
import { GradeService } from './grade.service';
import { GradeController } from './grade.controller';
import { GradeControllerMessage } from './controller/grade.controller.message';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Grade.name, schema: GradeSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  controllers: [GradeController, GradeControllerMessage],
  providers: [GradeService, PlatformAdminGuard],
  exports: [GradeService],
})
export class GradeModule {}
