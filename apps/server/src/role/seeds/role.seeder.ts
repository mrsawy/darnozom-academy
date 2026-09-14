import { Model } from 'mongoose';
import { Role } from '../entities/role.entity';
import { ROLE_SEED_DEFINITIONS } from './roles.config';

export class RoleSeeder {
  constructor(private readonly roleModel: Model<Role>) {}

  async seed() {
    for (const role of ROLE_SEED_DEFINITIONS) {
      await this.roleModel.findOneAndUpdate({ name: role.name }, role, {
        upsert: true,
        new: true,
      });
    }
  }
}
