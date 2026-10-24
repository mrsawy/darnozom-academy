import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Certificate, CertificateSchema } from './entities/certificate.entity';
import { Counter, CounterSchema } from './entities/counter.entity';
import { Group, GroupSchema } from 'src/academics/group/entities/group.entity';
import { Level, LevelSchema } from 'src/academics/level/entities/level.entity';
import { Course, CourseSchema } from 'src/course/entities/course.entity';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { Session, SessionSchema } from 'src/academics/session/entities/session.entity';
import { Organization, OrganizationSchema } from 'src/organization/entities/organization.entity';
import { CertificateCounterService } from './services/certificate-counter.service';
import { CertificateService } from './services/certificate.service';
import { CertificateControllerMessage } from './certificate.controller.message';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Certificate.name, schema: CertificateSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Level.name, schema: LevelSchema },
      { name: Course.name, schema: CourseSchema },
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  controllers: [CertificateControllerMessage],
  providers: [CertificateCounterService, CertificateService],
  exports: [CertificateService, CertificateCounterService],
})
export class CertificateModule {}
