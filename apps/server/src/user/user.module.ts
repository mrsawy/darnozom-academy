import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.entity';
import { UserService } from './services/user.service';
import { UserControllerHttp } from './controllers/http/user.controller.http';
import { UserControllerMessage } from './controllers/message/user.controller.message';
import { RoleModule } from '../role/role.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), RoleModule, forwardRef(() => AuthModule)],
  controllers: [UserControllerHttp, UserControllerMessage],
  providers: [UserService],
  exports: [MongooseModule, UserService],
})
export class UserModule {}
