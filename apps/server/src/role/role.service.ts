import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoleErrors } from '@islamic-academy/shared-types';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(@InjectModel(Role.name) private readonly roleModel: Model<Role>) {}

  create(createRoleDto: CreateRoleDto) {
    return new this.roleModel(createRoleDto).save();
  }

  findAll() {
    return this.roleModel.find().exec();
  }

  async findOne(name: string) {
    const role = await this.roleModel.findOne({ name }).exec();
    if (!role) throw new NotFoundException(RoleErrors.ROLE_NOT_FOUND);
    return role;
  }

  async update(name: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.roleModel.findOneAndUpdate({ name }, updateRoleDto, { new: true }).exec();
    if (!role) throw new NotFoundException(RoleErrors.ROLE_NOT_FOUND);
    return role;
  }

  async remove(name: string) {
    const role = await this.roleModel.findOneAndDelete({ name }).exec();
    if (!role) throw new NotFoundException(RoleErrors.ROLE_NOT_FOUND);
    return role;
  }
}
