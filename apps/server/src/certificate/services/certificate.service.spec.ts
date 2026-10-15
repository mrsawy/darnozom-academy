import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  AttendanceStatus,
  CertificateErrors,
  CertificateStatus,
  FinalResult,
  GroupPaymentStatus,
  GroupStatus,
  GroupStudentStatus,
  Roles,
  SessionStatus,
} from '@darnozom/shared-types';
import { CertificateService } from './certificate.service';
import { AcademicsActor } from 'src/academics/common/actor';

describe('CertificateService', () => {
  const orgId = new Types.ObjectId('64b0000000000000000000bb');
  const groupId = new Types.ObjectId('64b000000000000000000011');
  const levelId = new Types.ObjectId('64b000000000000000000022');
  const courseId = new Types.ObjectId('64b000000000000000000033');
  const studentId = new Types.ObjectId('64b000000000000000000055');
  const certId = new Types.ObjectId('64b000000000000000000077');

  const staffActor: AcademicsActor = {
    _id: '64b0000000000000000000aa',
    organizationId: String(orgId),
    roleName: Roles.MANAGER,
    additionalRoles: [Roles.MANAGER],
  };

  const studentActor: AcademicsActor = {
    _id: String(studentId),
    organizationId: String(orgId),
    roleName: Roles.STUDENT,
    additionalRoles: [],
  };

  let certModel: any;
  let groupModel: any;
  let levelModel: any;
  let courseModel: any;
  let userModel: any;
  let sessionModel: any;
  let orgModel: any;
  let counterService: any;
  let service: CertificateService;

  beforeEach(() => {
    certModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        exec: jest.fn().mockResolvedValue([]),
      }),
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    groupModel = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: groupId,
            organizationId: orgId,
            levelId,
            courseId,
            status: GroupStatus.COMPLETED,
            students: [
              {
                studentId,
                status: GroupStudentStatus.ACTIVE,
                paymentStatus: GroupPaymentStatus.PAID,
                finalResult: FinalResult.PASS,
              },
            ],
          }),
        }),
      }),
    };

    levelModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ name: 'Level 1' }),
          }),
        }),
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: levelId,
            name: 'Level 1',
            certificateRules: {
              minAttendancePercent: 80,
              requireExamPass: true,
              requireFullyPaid: true,
            },
          }),
        }),
      }),
    };

    courseModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ name: 'Quran Recitation' }),
          }),
        }),
      }),
    };

    userModel = {
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: studentId,
            firstName: 'Ahmad',
            lastName: 'Ali',
          }),
        }),
      }),
    };

    sessionModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              _id: new Types.ObjectId(),
              status: SessionStatus.COMPLETED,
              attendance: [
                {
                  studentId,
                  status: AttendanceStatus.PRESENT,
                },
              ],
              report: {
                evaluations: [
                  {
                    studentId,
                    homework: 5,
                  },
                ],
              },
            },
          ]),
        }),
      }),
    };

    orgModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ name: 'Dar Nozom' }),
          }),
        }),
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: orgId,
            name: 'Dar Nozom',
            shortCode: 'NOZOM',
          }),
        }),
      }),
    };

    counterService = {
      getNextSequence: jest.fn().mockResolvedValue(1),
    };

    service = new CertificateService(
      certModel,
      groupModel,
      levelModel,
      courseModel,
      userModel,
      sessionModel,
      orgModel,
      counterService,
    );
  });

  describe('evaluateGroup', () => {
    it('rejects if group is not COMPLETED', async () => {
      groupModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: groupId,
            status: GroupStatus.RUNNING,
            students: [],
          }),
        }),
      });

      await expect(
        service.evaluateGroup(staffActor, String(groupId)),
      ).rejects.toThrow(new BadRequestException(CertificateErrors.GROUP_NOT_COMPLETED));
    });

    it('creates certificate in NAME_REVIEW for eligible student', async () => {
      certModel.findOne.mockResolvedValue(null);
      await service.evaluateGroup(staffActor, String(groupId));

      expect(certModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          groupId,
          studentId,
          status: CertificateStatus.NAME_REVIEW,
          nameAr: 'Ahmad Ali',
          nameEn: 'Ahmad Ali',
          eligibility: expect.objectContaining({
            isEligible: true,
            attendancePercent: 100,
          }),
        }),
      );
    });

    it('leaves already ISSUED certificates untouched during re-evaluation', async () => {
      const issuedCert = {
        status: CertificateStatus.ISSUED,
        eligibility: { isEligible: true },
        save: jest.fn(),
      };
      certModel.findOne.mockResolvedValue(issuedCert);

      await service.evaluateGroup(staffActor, String(groupId));
      expect(issuedCert.save).not.toHaveBeenCalled();
    });
  });

  describe('updateName', () => {
    it('updates name for student owner', async () => {
      const certDoc = {
        studentId,
        organizationId: orgId,
        status: CertificateStatus.NAME_REVIEW,
        nameAr: 'Old Ar',
        nameEn: 'Old En',
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      certModel.findOne.mockResolvedValue(certDoc);

      const res = await service.updateName(studentActor, String(certId), {
        nameAr: 'أحمد علي',
        nameEn: 'Ahmad Ali',
      });

      expect(res.nameAr).toBe('أحمد علي');
      expect(res.nameEn).toBe('Ahmad Ali');
      expect(certDoc.save).toHaveBeenCalled();
    });

    it('blocks updating an ISSUED certificate (immutable)', async () => {
      const certDoc = {
        studentId,
        organizationId: orgId,
        status: CertificateStatus.ISSUED,
      };
      certModel.findOne.mockResolvedValue(certDoc);

      await expect(
        service.updateName(studentActor, String(certId), {
          nameAr: 'New Name',
          nameEn: 'New Name',
        }),
      ).rejects.toThrow(new ConflictException(CertificateErrors.CERTIFICATE_IMMUTABLE));
    });

    it('rejects empty names or names exceeding 100 chars', async () => {
      const certDoc = {
        studentId,
        organizationId: orgId,
        status: CertificateStatus.NAME_REVIEW,
      };
      certModel.findOne.mockResolvedValue(certDoc);

      await expect(
        service.updateName(studentActor, String(certId), {
          nameAr: '',
          nameEn: 'Valid Name',
        }),
      ).rejects.toThrow(new BadRequestException(CertificateErrors.CERTIFICATE_NAME_REQUIRED));

      await expect(
        service.updateName(studentActor, String(certId), {
          nameAr: 'A'.repeat(101),
          nameEn: 'Valid Name',
        }),
      ).rejects.toThrow(new BadRequestException(CertificateErrors.CERTIFICATE_NAME_TOO_LONG));
    });
  });

  describe('confirmName', () => {
    it('sets nameConfirmedBy and nameConfirmedAt', async () => {
      const certDoc = {
        studentId,
        organizationId: orgId,
        status: CertificateStatus.NAME_REVIEW,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      certModel.findOne.mockResolvedValue(certDoc);

      const res = await service.confirmName(studentActor, String(certId));
      expect(res.nameConfirmedBy).toEqual(studentId);
      expect(res.nameConfirmedAt).toBeInstanceOf(Date);
      expect(certDoc.save).toHaveBeenCalled();
    });
  });

  describe('issueCertificate', () => {
    it('rejects if name is not confirmed', async () => {
      const certDoc = {
        studentId,
        organizationId: orgId,
        status: CertificateStatus.NAME_REVIEW,
        nameConfirmedAt: null,
        eligibility: { isEligible: true },
      };
      certModel.findOne.mockResolvedValue(certDoc);

      await expect(
        service.issueCertificate(staffActor, String(certId)),
      ).rejects.toThrow(new BadRequestException(CertificateErrors.CERTIFICATE_NAME_NOT_CONFIRMED));
    });

    it('issues certificate with atomic serial, verification token, and QR code', async () => {
      const certDoc = {
        _id: certId,
        studentId,
        organizationId: orgId,
        status: CertificateStatus.NAME_REVIEW,
        nameConfirmedAt: new Date(),
        eligibility: { isEligible: true },
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      certModel.findOne.mockResolvedValue(certDoc);

      const issued = await service.issueCertificate(staffActor, String(certId));

      expect(issued.status).toBe(CertificateStatus.ISSUED);
      expect(issued.serial).toMatch(/^NOZOM-\d{4}-000001$/);
      expect(issued.verificationToken).toBeDefined();
      expect(typeof issued.verificationToken).toBe('string');
      expect(issued.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(issued.issuedAt).toBeInstanceOf(Date);
    });
  });

  describe('verifyPublic', () => {
    it('rejects unknown or invalid tokens with 404', async () => {
      certModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.verifyPublic('unknown-token')).rejects.toThrow(
        new NotFoundException(CertificateErrors.INVALID_VERIFICATION_TOKEN),
      );
    });

    it('returns public sanitized payload without IDs or personal contacts', async () => {
      const token = 'safe-token-123';
      const issuedAt = new Date('2026-10-15T12:00:00Z');
      certModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            nameAr: 'أحمد علي',
            nameEn: 'Ahmad Ali',
            courseId,
            levelId,
            organizationId: orgId,
            serial: 'NOZOM-2026-000001',
            issuedAt,
          }),
        }),
      });

      const res = await service.verifyPublic(token);

      expect(res).toEqual({
        studentNameAr: 'أحمد علي',
        studentNameEn: 'Ahmad Ali',
        courseName: 'Quran Recitation',
        levelName: 'Level 1',
        organizationName: 'Dar Nozom',
        serial: 'NOZOM-2026-000001',
        issuedAt,
      });

      // Verify no IDs in output
      expect((res as any)._id).toBeUndefined();
      expect((res as any).studentId).toBeUndefined();
      expect((res as any).organizationId).toBeUndefined();
    });
  });
});
