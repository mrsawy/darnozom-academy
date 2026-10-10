import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgoraService } from './agora.service';
import { AgoraControllerMessage } from './controllers/message/agora.controller.message';
import { AgoraControllerHttp } from './controllers/http/agora.controller.http';
import { CourseContent, CourseContentSchema } from 'src/course/entities/course-content.entity';
import { Enrollment, EnrollmentSchema } from 'src/enrollment/entities/enrollment.entity';
import { SessionBooking, SessionBookingSchema } from 'src/private-session/entities/session-booking.entity';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseContent.name, schema: CourseContentSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: SessionBooking.name, schema: SessionBookingSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  controllers: [AgoraControllerMessage, AgoraControllerHttp],
  providers: [AgoraService],
  exports: [AgoraService],
})
export class AgoraModule {}
