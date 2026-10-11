import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SchoolTypeErrors } from '@darnozom/shared-types';
import { SchoolTypeService } from './school-type.service';
import { SchoolType } from './entities/school-type.entity';
import { Course } from '../course/entities/course.entity';

const mockSchoolTypeModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
};

const mockCourseModel = {
  countDocuments: jest.fn(),
};

const mockSchoolType = {
  _id: 'school-type-id-123',
  nameEn: 'International',
  nameAr: 'دولي',
};

describe('SchoolTypeService', () => {
  let service: SchoolTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolTypeService,
        { provide: getModelToken(SchoolType.name), useValue: mockSchoolTypeModel },
        { provide: getModelToken(Course.name), useValue: mockCourseModel },
      ],
    }).compile();

    service = module.get<SchoolTypeService>(SchoolTypeService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a school type when the name is available', async () => {
      mockSchoolTypeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      mockSchoolTypeModel.create.mockResolvedValue(mockSchoolType);

      const result = await service.create({ nameEn: 'International', nameAr: 'دولي' });

      expect(result).toEqual(mockSchoolType);
      expect(mockSchoolTypeModel.create).toHaveBeenCalled();
    });

    it('throws ConflictException when the name already exists', async () => {
      mockSchoolTypeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSchoolType) });

      await expect(service.create({ nameEn: 'International', nameAr: 'دولي' })).rejects.toThrow(ConflictException);
      expect(mockSchoolTypeModel.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns a school type when found', async () => {
      mockSchoolTypeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSchoolType) });

      const result = await service.findOne('school-type-id-123');

      expect(result).toEqual(mockSchoolType);
    });

    it('throws NotFoundException when the school type does not exist', async () => {
      mockSchoolTypeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates a school type when the new name is available', async () => {
      mockSchoolTypeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      mockSchoolTypeModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockSchoolType, nameEn: 'National' }),
      });

      const result = await service.update('school-type-id-123', { nameEn: 'National' });

      expect(result.nameEn).toBe('National');
    });

    it('throws ConflictException when the new name collides with another school type', async () => {
      mockSchoolTypeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockSchoolType, _id: 'other-id' }),
      });

      await expect(service.update('school-type-id-123', { nameEn: 'Taken' })).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when the school type does not exist', async () => {
      mockSchoolTypeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      mockSchoolTypeModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.update('school-type-id-123', { nameEn: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the school type does not exist', async () => {
      mockSchoolTypeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the school type is referenced by a course', async () => {
      mockSchoolTypeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSchoolType) });
      mockCourseModel.countDocuments.mockResolvedValue(2);

      await expect(service.remove('school-type-id-123')).rejects.toThrow(ConflictException);
      expect(mockSchoolTypeModel.updateOne).not.toHaveBeenCalled();
    });

    it('soft-deletes the school type when no course references it', async () => {
      mockSchoolTypeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSchoolType) });
      mockCourseModel.countDocuments.mockResolvedValue(0);
      mockSchoolTypeModel.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const result = await service.remove('school-type-id-123', '507f1f77bcf86cd799439011');

      expect(result.message).toBeDefined();
      expect(mockSchoolTypeModel.updateOne).toHaveBeenCalled();
      const [, update] = mockSchoolTypeModel.updateOne.mock.calls[0] as [unknown, { $set: { deletedAt: Date; deletedById: unknown } }];
      expect(update.$set.deletedAt).toBeInstanceOf(Date);
      expect(String(update.$set.deletedById)).toBe('507f1f77bcf86cd799439011');
    });
  });

  it('uses school-type-specific error keys for conflicts', async () => {
    mockSchoolTypeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSchoolType) });

    await expect(service.create({ nameEn: 'International', nameAr: 'دولي' })).rejects.toThrow(SchoolTypeErrors.SCHOOL_TYPE_NAME_ALREADY_EXISTS);
  });
});
