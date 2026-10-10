import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WishlistService } from './service/wishlist.service';
import { WishlistControllerHttp } from './controllers/wishlist.controller.http';
import { WishlistControllerMessage } from './controllers/wishlist.controller.message';
import { Wishlist, WishlistSchema } from './entities/wishlist.entity';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { Course, CourseSchema } from 'src/course/entities/course.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wishlist.name, schema: WishlistSchema },
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  controllers: [WishlistControllerHttp, WishlistControllerMessage],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
