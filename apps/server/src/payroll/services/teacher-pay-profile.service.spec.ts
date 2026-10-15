import { Types } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Currency, PayrollErrors, TeacherPayModel } from '@darnozom/shared-types';
import { TeacherPayProfileService } from './teacher-pay-profile.service';

describe('TeacherPayProfileService', () => {
  let service: TeacherPayProfileService;
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    aggregate: jest.Mock;
  };

  const orgId = new Types.ObjectId().toString();
  const teacherId = new Types.ObjectId().toString();

  beforeEach(() => {
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      aggregate: jest.fn(),
    };

    service = new TeacherPayProfileService(model as never);
  });

  describe('upsertProfile', () => {
    it('creates a profile successfully', async () => {
      const dto = {
        model: TeacherPayModel.PER_SESSION,
        rate: 50,
        currency: Currency.USD,
        effectiveFrom: new Date('2026-10-01'),
      };

      const created = {
        _id: new Types.ObjectId(),
        organizationId: new Types.ObjectId(orgId),
        teacherId: new Types.ObjectId(teacherId),
        ...dto,
      };
      model.create.mockResolvedValue(created);

      const result = await service.upsertProfile(orgId, teacherId, dto);
      expect(result).toBe(created);
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: expect.any(Types.ObjectId),
          teacherId: expect.any(Types.ObjectId),
          model: TeacherPayModel.PER_SESSION,
          rate: 50,
        })
      );
    });

    it('rejects negative rate', async () => {
      await expect(
        service.upsertProfile(orgId, teacherId, {
          model: TeacherPayModel.FIXED,
          rate: -10,
          currency: Currency.USD,
        })
      ).rejects.toThrow(new BadRequestException(PayrollErrors.INVALID_PAY_RATE));
    });

    it('rejects revenue share rate > 100', async () => {
      await expect(
        service.upsertProfile(orgId, teacherId, {
          model: TeacherPayModel.REVENUE_SHARE,
          rate: 105,
          currency: Currency.USD,
        })
      ).rejects.toThrow(new BadRequestException(PayrollErrors.INVALID_PAY_RATE));
    });
  });

  describe('getProfileForTeacher', () => {
    it('returns the latest profile for a teacher', async () => {
      const profile = {
        _id: new Types.ObjectId(),
        organizationId: new Types.ObjectId(orgId),
        teacherId: new Types.ObjectId(teacherId),
        model: TeacherPayModel.FIXED,
        rate: 1000,
        currency: Currency.EGP,
      };

      const sortMock = jest.fn().mockResolvedValue(profile);
      model.findOne.mockReturnValue({ sort: sortMock });

      const result = await service.getProfileForTeacher(orgId, teacherId);
      expect(result).toBe(profile);
      expect(model.findOne).toHaveBeenCalledWith({
        organizationId: new Types.ObjectId(orgId),
        teacherId: new Types.ObjectId(teacherId),
      });
      expect(sortMock).toHaveBeenCalledWith({ effectiveFrom: -1 });
    });

    it('throws not found if teacher has no profile', async () => {
      const sortMock = jest.fn().mockResolvedValue(null);
      model.findOne.mockReturnValue({ sort: sortMock });

      await expect(service.getProfileForTeacher(orgId, teacherId)).rejects.toThrow(new NotFoundException(PayrollErrors.PAY_PROFILE_NOT_FOUND));
    });
  });

  describe('findEffectiveProfile', () => {
    it('finds profile with effectiveFrom <= date', async () => {
      const targetDate = new Date('2026-10-01T00:00:00.000Z');
      const profile = {
        model: TeacherPayModel.PER_HOUR,
        rate: 60,
        effectiveFrom: new Date('2026-09-01T00:00:00.000Z'),
      };

      const sortMock = jest.fn().mockResolvedValue(profile);
      model.findOne.mockReturnValue({ sort: sortMock });

      const result = await service.findEffectiveProfile(orgId, teacherId, targetDate);
      expect(result).toBe(profile);
      expect(model.findOne).toHaveBeenCalledWith({
        organizationId: new Types.ObjectId(orgId),
        teacherId: new Types.ObjectId(teacherId),
        effectiveFrom: { $lte: targetDate },
      });
      expect(sortMock).toHaveBeenCalledWith({ effectiveFrom: -1 });
    });

    it('falls back to earliest profile if all effectiveFrom are after target date', async () => {
      const targetDate = new Date('2026-08-01T00:00:00.000Z');
      const earliestProfile = {
        model: TeacherPayModel.PER_HOUR,
        rate: 60,
        effectiveFrom: new Date('2026-09-01T00:00:00.000Z'),
      };

      const sortMock1 = jest.fn().mockResolvedValue(null);
      const sortMock2 = jest.fn().mockResolvedValue(earliestProfile);

      model.findOne.mockReturnValueOnce({ sort: sortMock1 }).mockReturnValueOnce({ sort: sortMock2 });

      const result = await service.findEffectiveProfile(orgId, teacherId, targetDate);
      expect(result).toBe(earliestProfile);
      expect(sortMock2).toHaveBeenCalledWith({ effectiveFrom: 1 });
    });
  });

  describe('getProfiles', () => {
    it('aggregates to get latest profile per teacher', async () => {
      const list = [{ teacherId: new Types.ObjectId(), model: TeacherPayModel.FIXED, rate: 1000 }];
      model.aggregate.mockResolvedValue(list);

      const result = await service.getProfiles(orgId);
      expect(result).toBe(list);
      expect(model.aggregate).toHaveBeenCalled();
    });
  });
});
