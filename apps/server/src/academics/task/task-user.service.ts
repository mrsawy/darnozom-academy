import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Roles } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class TaskUserService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  /** Every user holding MANAGER in the organization — the level-2 queue (spec assumption A2). */
  async managerIdsInOrg(organizationId: Types.ObjectId | string): Promise<string[]> {
    const users = await this.userModel
      .find({ organizationId: new Types.ObjectId(String(organizationId)), deletedAt: null })
      .select('_id roleName additionalRoles')
      .lean<{ _id: Types.ObjectId; roleName?: string; additionalRoles?: string[] }[]>()
      .exec();
    return users
      .filter((user) => user.roleName === Roles.MANAGER || (user.additionalRoles ?? []).includes(Roles.MANAGER))
      .map((user) => String(user._id));
  }
}
