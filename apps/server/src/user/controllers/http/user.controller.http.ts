import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../../services/user.service';
import mongoose from 'mongoose';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { Actions, ConditionKeys, Roles, Subjects } from '@darnozom/shared-types';
import { RoleService } from 'src/role/role.service';
import { handleError } from 'src/utils/errorHandling';
import { AppAbility } from 'src/role/permissions.factory';
import { checkConditionForRule } from 'src/utils/abilityUtils';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { SkipOnboardingCheck } from 'src/auth/decorators/skip-onboarding-check.decorator';
import { CreateUserDto, UpdateUserDto } from '@darnozom/shared-types/dto';
import { CheckSubscriptionLimit } from 'src/subscription/decorators/check-subscription-limit.decorator';
import { SubscriptionService } from 'src/subscription/services/subscription.service';

@Controller('user')
export class UserControllerHttp {
  constructor(
    private readonly userService: UserService,
    private readonly roleService: RoleService,
    private readonly subscriptionService: SubscriptionService
  ) {}

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.USER })
  @CheckSubscriptionLimit('usersPerSubscription')
  @Post()
  async create(@Body() createUserDto: CreateUserDto, @Request() req: IUserRequest) {
    try {
      const organizationId = req.user.organizationId;
      if (!organizationId) {
        throw new Error('User organization not found');
      }
      const role = createUserDto.roleName;
      await this.roleService.findOne(role);
      if (role === Roles.PARENT) {
        await this.subscriptionService.assertWithinLimit(organizationId.toString(), 'parentAccountsPerSubscription');
      }
      const createdUserDoc = await this.userService.create({
        ...createUserDto,
        organizationId,
      });
      const createdPlain = createdUserDoc.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
      const { password: _password, ...createdUser } = createdPlain;

      this.subscriptionService.incrementUsage(organizationId.toString(), 'usersUsed');
      if (role === Roles.PARENT) {
        this.subscriptionService.incrementUsage(organizationId.toString(), 'parentUsersUsed');
      }

      return {
        message: 'User created successfully',
        user: createdUser,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        handleError(error);
      } else {
        handleError(String(error));
      }
    }
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.USER })
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get('user-data')
  @SkipOnboardingCheck()
  @UseGuards(AuthGuard)
  async findOwnData(@Request() req: IUserRequest) {
    const user = req.user;
    const foundedUser = await this.userService.findOne(user._id.toString());
    if (!foundedUser) throw new UnauthorizedException('User not found');
    // Must serialize with toObject() — spreading/destructuring a Mongoose document can
    // copy internal keys ($__, $$populatedVirtuals, _doc) into API/clients.
    const plain = foundedUser.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
    const { password: _password, ...userData } = plain;
    return {
      message: 'User data fetched successfully',
      user: userData as Record<string, unknown>,
    };
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.USER })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: IUserRequest & { userAbility?: AppAbility }) {
    const userAbility = req.userAbility!;

    const { hasCondition, conditionValue } = checkConditionForRule(userAbility, Actions.UPDATE, Subjects.USER, ConditionKeys.SELF);

    if (hasCondition && id !== conditionValue) {
      throw new UnauthorizedException('You can only update your own user information');
    }

    if (updateUserDto.roleName && userAbility.cannot(Actions.UPDATE, Subjects.ROLE)) {
      throw new UnauthorizedException('You do not have permission to update roles');
    }

    return this.userService.update({ _id: new mongoose.Types.ObjectId(id) }, updateUserDto);
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.userService.remove(+id);
  // }
}
