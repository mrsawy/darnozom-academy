import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RoleService } from './role.service';
import { Role } from './entities/role.entity';
import { User } from '../user/entities/user.entity';
import { Actions, Roles, Subjects } from '@lms-organization/shared-types';

const mockRoleModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  deleteOne: jest.fn(),
};

const mockUserModel = {
  countDocuments: jest.fn(),
};

const mockRole = {
  _id: 'role-id-123',
  name: Roles.ADMIN,
  permissions: [{ action: Actions.READ, subject: Subjects.USER }],
};

const mockPermissions = [{ action: Actions.READ, subject: Subjects.USER }];

describe('RoleService', () => {
  let service: RoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: getModelToken(Role.name), useValue: mockRoleModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns all roles sorted by name', async () => {
      const exec = jest.fn().mockResolvedValue([mockRole]);
      const sort = jest.fn().mockReturnValue({ exec });
      mockRoleModel.find.mockReturnValue({ sort });

      const result = await service.findAll();

      expect(result).toEqual([mockRole]);
      expect(mockRoleModel.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns a role when found by name', async () => {
      mockRoleModel.findOne.mockResolvedValue(mockRole);

      const result = await service.findOne(Roles.ADMIN);

      expect(result).toEqual(mockRole);
    });

    it('throws NotFoundException when role is not found', async () => {
      mockRoleModel.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a role successfully', async () => {
      mockRoleModel.findOne.mockResolvedValue(null);
      mockRoleModel.create.mockResolvedValue(mockRole);

      const result = await service.create({ name: Roles.ADMIN, permissions: mockPermissions });

      expect(result.role).toEqual(mockRole);
    });

    it('throws ConflictException when role already exists', async () => {
      mockRoleModel.findOne.mockResolvedValue(mockRole);

      await expect(service.create({ name: Roles.ADMIN, permissions: mockPermissions })).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates permissions successfully', async () => {
      mockRoleModel.findOneAndUpdate.mockResolvedValue({ ...mockRole, permissions: mockPermissions });

      const result = await service.update('role-id-123', { permissions: mockPermissions });

      expect(result.role).toBeDefined();
    });

    it('throws NotFoundException when role does not exist', async () => {
      mockRoleModel.findOneAndUpdate.mockResolvedValue(null);

      await expect(service.update('role-id-123', { permissions: mockPermissions })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws ConflictException for protected roles', async () => {
      mockRoleModel.findOne.mockResolvedValue({ ...mockRole, name: Roles.PLATFORM_ADMIN });

      await expect(service.remove('role-id-123')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when role is assigned to users', async () => {
      mockRoleModel.findOne.mockResolvedValue(mockRole);
      mockUserModel.countDocuments.mockResolvedValue(5);

      await expect(service.remove('role-id-123')).rejects.toThrow(ConflictException);
    });

    it('deletes a role when safe', async () => {
      mockRoleModel.findOne.mockResolvedValue({ ...mockRole, _id: { toString: () => 'role-id-123' } });
      mockUserModel.countDocuments.mockResolvedValue(0);
      mockRoleModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.remove('role-id-123');

      expect(result.message).toBeDefined();
    });
  });
});
