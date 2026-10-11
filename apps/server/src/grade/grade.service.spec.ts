import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { GradeErrors } from '@darnozom/shared-types';
import { GradeService } from './grade.service';
import { Grade } from './entities/grade.entity';
import { Course } from '../course/entities/course.entity';

const mockGradeModel = {
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

const mockGrade = {
  _id: 'grade-id-123',
  nameEn: '1st Preparatory',
  nameAr: 'الصف الأول الإعدادي',
};

describe('GradeService', () => {
  let service: GradeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradeService,
        { provide: getModelToken(Grade.name), useValue: mockGradeModel },
        { provide: getModelToken(Course.name), useValue: mockCourseModel },
      ],
    }).compile();

    service = module.get<GradeService>(GradeService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a grade when the name is available', async () => {
      mockGradeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      mockGradeModel.create.mockResolvedValue(mockGrade);

      const result = await service.create({ nameEn: '1st Preparatory', nameAr: 'الصف الأول الإعدادي' });

      expect(result).toEqual(mockGrade);
      expect(mockGradeModel.create).toHaveBeenCalled();
    });

    it('throws ConflictException when the name already exists', async () => {
      mockGradeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockGrade) });

      await expect(service.create({ nameEn: '1st Preparatory', nameAr: 'الصف الأول الإعدادي' })).rejects.toThrow(ConflictException);
      expect(mockGradeModel.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns a grade when found', async () => {
      mockGradeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockGrade) });

      const result = await service.findOne('grade-id-123');

      expect(result).toEqual(mockGrade);
    });

    it('throws NotFoundException when the grade does not exist', async () => {
      mockGradeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates a grade when the new name is available', async () => {
      mockGradeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      mockGradeModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockGrade, nameEn: '2nd Preparatory' }),
      });

      const result = await service.update('grade-id-123', { nameEn: '2nd Preparatory' });

      expect(result.nameEn).toBe('2nd Preparatory');
    });

    it('throws ConflictException when the new name collides with another grade', async () => {
      mockGradeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockGrade, _id: 'other-id' }),
      });

      await expect(service.update('grade-id-123', { nameEn: 'Taken' })).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when the grade does not exist', async () => {
      mockGradeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      mockGradeModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.update('grade-id-123', { nameEn: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the grade does not exist', async () => {
      mockGradeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the grade is referenced by a course', async () => {
      mockGradeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockGrade) });
      mockCourseModel.countDocuments.mockResolvedValue(3);

      await expect(service.remove('grade-id-123')).rejects.toThrow(ConflictException);
      expect(mockGradeModel.updateOne).not.toHaveBeenCalled();
    });

    it('soft-deletes the grade when no course references it', async () => {
      mockGradeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockGrade) });
      mockCourseModel.countDocuments.mockResolvedValue(0);
      mockGradeModel.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const result = await service.remove('grade-id-123', '507f1f77bcf86cd799439011');

      expect(result.message).toBeDefined();
      expect(mockGradeModel.updateOne).toHaveBeenCalled();
      const [, update] = mockGradeModel.updateOne.mock.calls[0] as [unknown, { $set: { deletedAt: Date; deletedById: unknown } }];
      expect(update.$set.deletedAt).toBeInstanceOf(Date);
      expect(String(update.$set.deletedById)).toBe('507f1f77bcf86cd799439011');
    });
  });

  it('uses grade-specific error keys for conflicts', async () => {
    mockGradeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockGrade) });

    await expect(service.create({ nameEn: '1st Preparatory', nameAr: 'الصف الأول الإعدادي' })).rejects.toThrow(GradeErrors.GRADE_NAME_ALREADY_EXISTS);
  });
});
