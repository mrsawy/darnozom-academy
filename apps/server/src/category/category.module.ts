import { forwardRef, Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryHttpController } from './category.controller.http';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './entities/category.entity';
import { CategoryMessageController } from './category.controller.message';
import { AuthModule } from '../auth/auth.module';
import { RoleModule } from '../role/role.module';
import { CategoryCountListener } from './events/category-count.listener';
import { Course, CourseSchema } from '../course/entities/course.entity';
import { User, UserSchema } from '../user/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Course.name, schema: CourseSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  controllers: [CategoryHttpController, CategoryMessageController],
  providers: [CategoryService, CategoryCountListener],
  exports: [CategoryService],
})
export class CategoryModule {}
