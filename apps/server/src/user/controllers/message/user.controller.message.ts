import { Controller, UseGuards, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { UserService } from '../../services/user.service';
import { User } from '../../entities/user.entity';
import mongoose, { Connection, PaginateOptions } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleService } from 'src/role/role.service';
import { handleRpcError } from 'src/utils/errorHandling';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { WalletService } from 'src/wallet/wallet.service';
import { convertObjectValuesToObjectId } from 'src/utils/ObjectId.utils';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { CreateUserDto } from '@darnozom/shared-types/dto';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { Actions, Roles, Subjects, UserErrors, UserSuccessMessages } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';

@Controller('user')
@ApplyRpcErrorHandling
export class UserControllerMessage {
  private readonly logger = new Logger(UserControllerMessage.name);

  constructor(
    private readonly userService: UserService,
    private readonly roleService: RoleService,
    @Inject(forwardRef(() => WalletService)) private readonly walletService: WalletService,
    @InjectConnection() private readonly connection: Connection,
    private readonly subscriptionService: SubscriptionService
  ) {}

  @MessagePattern('user.getOwnData')
  @UseGuards(AuthGuard)
  async findOwnData(@Ctx() context: IUserContext) {
    const user = context.userPayload;
    const { password: _password, ...userData } = user;
    if (user.roleName === Roles.GUEST) {
      const latestUser = await this.userService.findOne(context.userPayload._id.toString());
      const plain = latestUser.toObject({ virtuals: true }) as Record<string, unknown>;
      const { password: _password, ...latestUserData } = plain;
      return {
        message: UserSuccessMessages.USER_DATA_FETCHED,
        user: { ...latestUserData, ability: undefined },
      };
    }
    return {
      message: UserSuccessMessages.USER_DATA_FETCHED,
      user: { ...userData, ability: undefined },
    };
  }

  @MessagePattern('user.updateOwnData')
  @UseGuards(AuthGuard)
  async updateOwnData(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: Partial<CreateUserDto>
  ) {
    const filter = { _id: new mongoose.Types.ObjectId(context.userPayload._id) };
    const { preferredCurrency, ...rest } = payload;
    const currencyChanged = preferredCurrency !== undefined && preferredCurrency !== context.userPayload.preferredCurrency;

    if (!currencyChanged) {
      return await this.userService.update(filter, rest);
    }

    // The wallet must switch currency (and convert its balance) together with the user.
    const session = await this.connection.startSession();
    try {
      let result: Awaited<ReturnType<UserService['update']>> | undefined;
      await session.withTransaction(async () => {
        await this.walletService.changeCurrency(context.userPayload.walletId, preferredCurrency, session);
        result = await this.userService.update(filter, { ...rest, preferredCurrency }, session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  @MessagePattern('users.getByOrganization')
  @UseGuards(AuthGuard)
  async getByOrganization(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: {
      options: PaginateOptions;
      filters?: mongoose.RootFilterQuery<User>;
    }
  ) {
    if (!context.userPayload.organizationId) {
      throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }
    return await this.userService.getByOrganization(context.userPayload.organizationId, payload.options, payload.filters);
  }

  @MessagePattern('users.getSingleUserByOrganization')
  @UseGuards(AuthGuard)
  async getSingleUserByOrganization(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: { filters: mongoose.RootFilterQuery<User> }
  ) {
    const user = await this.userService.filterOne({
      ...convertObjectValuesToObjectId(payload.filters as Record<string, unknown>),
      authorization: undefined,
      organizationId: new mongoose.Types.ObjectId(context.userPayload.organizationId),
    });
    if (user.roleName === Roles.PARENT) {
      await user.populate('childUsers', '_id firstName lastName username email phone roleName');
    } else if (user.roleName == Roles.STUDENT) {
      await user.populate('parentUser', '_id firstName lastName username email phone roleName');
    }
    if (!user) throw new BadRequestException(UserErrors.USER_NOT_FOUND);
    const { password: _password, ...userData } = user.toObject();
    return userData;
  }

  // Create User by organization
  // @CheckSubscriptionLimit('usersPerSubscription')
  @UseGuards(AuthGuard)
  @MessagePattern('users.organizationCreateUser')
  async organizationCreateUser(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: CreateUserDto
  ) {
    this.logger.debug(`organizationCreateUser payload: ${JSON.stringify(payload)}`);

    if (payload.roleName === Roles.PLATFORM_ADMIN) {
      throw new BadRequestException(UserErrors.CANNOT_ASSIGN_PLATFORM_ADMIN);
    }

    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const organizationId = context.userPayload.organizationId;
      if (!organizationId) {
        throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
      }
      if (payload.roleName === Roles.PARENT) {
        await this.subscriptionService.assertWithinLimit(organizationId.toString(), 'parentAccountsPerSubscription');
      }
      const userId = new mongoose.Types.ObjectId();
      const walletId = new mongoose.Types.ObjectId();
      const createUserPayload = {
        ...convertObjectValuesToObjectId(payload),
        _id: userId,
        organizationId: new mongoose.Types.ObjectId(organizationId),
        walletId,
      };
      const createdUser = await this.userService.create(createUserPayload, session);
      await this.walletService.create({ _id: walletId, userId: userId, currency: payload.preferredCurrency }, session);

      await this.subscriptionService.incrementUsage(organizationId.toString(), 'usersUsed', 1, session);
      if (payload.roleName === Roles.PARENT) {
        await this.subscriptionService.incrementUsage(organizationId.toString(), 'parentUsersUsed', 1, session);
      }

      await session.commitTransaction();
      return createdUser;
    } catch (error: unknown) {
      await session.abortTransaction();
      await session.endSession();

      this.logger.warn(`organizationCreateUser error: ${JSON.stringify(error)}`);
      handleRpcError(error);
    }
  }

  @MessagePattern('users.organizationUpdateUser')
  @UseGuards(AuthGuard)
  async organizationUpdateUser(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: { userId: string; userData: Partial<CreateUserDto> }
  ) {
    if (payload.userData.roleName === Roles.PLATFORM_ADMIN) {
      throw new BadRequestException(UserErrors.CANNOT_ASSIGN_PLATFORM_ADMIN);
    }

    return await this.userService.update(
      {
        _id: new mongoose.Types.ObjectId(payload.userId),
        organizationId: new mongoose.Types.ObjectId(context.userPayload.organizationId),
      },
      payload.userData
    );
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.ROLE })
  @MessagePattern('users.setAdditionalRoles')
  @UseGuards(AuthGuard)
  async setAdditionalRoles(@Ctx() context: IUserContext, @Payload() payload: { userId: string; additionalRoles: string[] }) {
    return this.userService.setAdditionalRoles(
      String(context.userPayload.organizationId),
      payload.userId,
      Array.isArray(payload.additionalRoles) ? payload.additionalRoles : []
    );
  }

  @MessagePattern('users.completeOrganizationOnboarding')
  @UseGuards(AuthGuard)
  async completeOrganizationOnboarding(@Ctx() context: IUserContext) {
    return await this.userService.completeOrganizationOnboarding(context.userPayload._id.toString());
  }

  @MessagePattern('users.organizationDeleteUser')
  @UseGuards(AuthGuard)
  async organizationDeleteUser(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: { userId: string }
  ) {
    const organizationId = context.userPayload.organizationId;
    if (!organizationId) {
      throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }
    const result = await this.userService.delete(
      {
        _id: new mongoose.Types.ObjectId(payload.userId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
      },
      context.userPayload._id?.toString()
    );

    if (result.deletedCount == 0) throw new BadRequestException(UserErrors.USER_NOT_FOUND);

    return result;
  }
}
