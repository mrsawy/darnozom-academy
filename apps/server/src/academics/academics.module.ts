import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { Course, CourseSchema } from 'src/course/entities/course.entity';
import { Program, ProgramSchema } from './program/entities/program.entity';
import { ProgramService } from './program/program.service';
import { ProgramControllerMessage } from './program/program.controller.message';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Program.name, schema: ProgramSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  controllers: [ProgramControllerMessage],
  providers: [ProgramService],
})
export class AcademicsModule {}
