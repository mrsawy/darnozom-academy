import { Module } from '@nestjs/common';
import { PageService } from './page.service';
import { PageControllerMessage } from './page.controller.message';
import { Page, PageSchema } from './entities/page.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { Organization, OrganizationSchema } from 'src/organization/entities/organization.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Page.name, schema: PageSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    AuthModule,
    RoleModule,
    SubscriptionModule,
  ],
  controllers: [PageControllerMessage],
  providers: [PageService],
})
export class PageModule {}
