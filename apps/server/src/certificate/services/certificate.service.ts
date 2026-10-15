import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import {
  AttendanceStatus,
  CertificateErrors,
  CertificateStatus,
  FinalResult,
  GetCertificatesFilterDto,
  GroupPaymentStatus,
  GroupStatus,
  GroupStudentStatus,
  PublicCertificateVerification,
  Roles,
  SessionStatus,
  UpdateCertificateNameDto,
} from '@darnozom/shared-types';
import { AcademicsActor } from 'src/academics/common/actor';
import { Group } from 'src/academics/group/entities/group.entity';
import { Level } from 'src/academics/level/entities/level.entity';
import { Course } from 'src/course/entities/course.entity';
import { User } from 'src/user/entities/user.entity';
import { Session } from 'src/academics/session/entities/session.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import { FamilyPaymentStatusService } from 'src/billing/status/family-payment-status.service';
import { Certificate } from '../entities/certificate.entity';
import { CertificateCounterService } from './certificate-counter.service';
import {
  evaluateEligibility,
  StudentEligibilityInput,
} from '../domain/certificate-eligibility';
import { formatCertificateSerial } from '../domain/certificate-serial';

const oid = (id: string | Types.ObjectId) =>
  Types.ObjectId.isValid(String(id))
    ? new Types.ObjectId(String(id))
    : (id as unknown as Types.ObjectId);

@Injectable()
export class CertificateService {
  constructor(
    @InjectModel(Certificate.name)
    private readonly certModel: Model<Certificate>,
    @InjectModel(Group.name)
    private readonly groupModel: Model<Group>,
    @InjectModel(Level.name)
    private readonly levelModel: Model<Level>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<Course>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<Session>,
    @InjectModel(Organization.name)
    private readonly orgModel: Model<Organization>,
    private readonly counterService: CertificateCounterService,
    @Optional()
    private readonly paymentStatusService?: FamilyPaymentStatusService,
  ) {}

  private getBaseUrl(): string {
    return process.env.FRONTEND_URL || 'https://darnozom.com';
  }

  private isPrivilegedStaff(actor: AcademicsActor): boolean {
    const roles = [actor.roleName, ...(actor.additionalRoles || [])];
    return roles.some((r) =>
      [
        Roles.OWNER,
        Roles.MANAGER,
        Roles.SUPER_ADMIN,
        Roles.COORDINATOR,
        Roles.ACCOUNTANT,
      ].includes(r),
    );
  }

  /**
   * Evaluates all active students in a completed group against the level's certificate rules.
   * Creates or updates certificates for eligible students in NAME_REVIEW status.
   */
  async evaluateGroup(
    actor: AcademicsActor,
    groupId: string,
  ): Promise<Certificate[]> {
    const group = await this.groupModel
      .findOne({
        _id: oid(groupId),
        organizationId: oid(actor.organizationId),
      })
      .lean()
      .exec();

    if (!group) {
      throw new NotFoundException(CertificateErrors.CERTIFICATE_NOT_FOUND);
    }

    if (group.status !== GroupStatus.COMPLETED) {
      throw new BadRequestException(CertificateErrors.GROUP_NOT_COMPLETED);
    }

    const level = await this.levelModel
      .findById(group.levelId)
      .lean()
      .exec();

    const completedSessions = await this.sessionModel
      .find({
        groupId: group._id,
        status: SessionStatus.COMPLETED,
        deletedAt: null,
      })
      .lean()
      .exec();

    const activeStudents = group.students.filter(
      (s) => s.status === GroupStudentStatus.ACTIVE,
    );

    for (const student of activeStudents) {
      const studentIdStr = String(student.studentId);

      // 1. Attendance percentage
      const attendedCount = completedSessions.filter((session) =>
        session.attendance?.some(
          (a) =>
            String(a.studentId) === studentIdStr &&
            [
              AttendanceStatus.PRESENT,
              AttendanceStatus.LATE,
              AttendanceStatus.EXCUSED,
            ].includes(a.status),
        ),
      ).length;

      // 2. Homework average
      const homeworkScores: number[] = [];
      for (const session of completedSessions) {
        const evaluation = session.report?.evaluations?.find(
          (e) => String(e.studentId) === studentIdStr,
        );
        if (evaluation && typeof evaluation.homework === 'number') {
          homeworkScores.push(evaluation.homework);
        }
      }

      // 3. Exam final result
      const finalResult = student.finalResult ?? null;

      // 4. Payment status
      const paymentStatus = student.paymentStatus ?? GroupPaymentStatus.UNPAID;

      const input: StudentEligibilityInput = {
        completedSessionsCount: completedSessions.length,
        attendedSessionsCount: attendedCount,
        homeworkScores,
        finalResult,
        paymentStatus,
        hasOverdueCharges: false,
      };

      const eligibility = evaluateEligibility(level?.certificateRules, input);

      if (eligibility.isEligible) {
        const existingCert = await this.certModel.findOne({
          groupId: group._id,
          studentId: student.studentId,
        });

        if (existingCert) {
          // If already issued, leave immutable
          if (existingCert.status !== CertificateStatus.ISSUED) {
            existingCert.eligibility = eligibility;
            await existingCert.save();
          }
        } else {
          // Create new certificate in NAME_REVIEW
          const studentUser = await this.userModel
            .findById(student.studentId)
            .lean()
            .exec();

          const studentFullName =
            `${studentUser?.firstName ?? ''} ${studentUser?.lastName ?? ''}`.trim() ||
            'Student';

          await this.certModel.create({
            organizationId: group.organizationId,
            groupId: group._id,
            levelId: group.levelId,
            courseId: group.courseId,
            studentId: student.studentId,
            status: CertificateStatus.NAME_REVIEW,
            eligibility,
            nameAr: studentFullName,
            nameEn: studentFullName,
            nameConfirmedBy: null,
            nameConfirmedAt: null,
          });
        }
      }
    }

    return this.certModel
      .find({
        groupId: group._id,
      })
      .exec();
  }

  /** Returns the child user IDs that belong to this parent actor. */
  private async getParentChildIds(parentId: string): Promise<Types.ObjectId[]> {
    const parentDoc = await this.userModel
      .findOne({ _id: oid(parentId) })
      .select('childUsersIds')
      .lean<{ childUsersIds?: Types.ObjectId[] }>()
      .exec();
    return parentDoc?.childUsersIds ?? [];
  }

  /**
   * Query certificates for organization, group, or student.
   */
  async find(
    actor: AcademicsActor,
    filter: GetCertificatesFilterDto,
  ): Promise<Certificate[]> {
    const query: Record<string, unknown> = {
      organizationId: oid(actor.organizationId),
    };

    if (actor.roleName === Roles.STUDENT) {
      query.studentId = oid(actor._id);
    } else if (actor.roleName === Roles.PARENT) {
      const childIds = await this.getParentChildIds(actor._id);
      if (filter.studentId) {
        const isOwnChild = childIds.some((id) => String(id) === filter.studentId);
        if (!isOwnChild) throw new ForbiddenException();
        query.studentId = oid(filter.studentId);
      } else {
        query.studentId = { $in: childIds };
      }
    } else if (filter.studentId) {
      query.studentId = oid(filter.studentId);
    }

    if (filter.groupId) {
      query.groupId = oid(filter.groupId);
    }

    if (filter.status) {
      query.status = filter.status;
    }

    return this.certModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find single certificate by ID with authorization verification.
   */
  async findById(actor: AcademicsActor, id: string): Promise<Certificate> {
    const cert = await this.certModel.findOne({
      _id: oid(id),
      organizationId: oid(actor.organizationId),
    });

    if (!cert) {
      throw new NotFoundException(CertificateErrors.CERTIFICATE_NOT_FOUND);
    }

    if (actor.roleName === Roles.STUDENT && String(cert.studentId) !== actor._id) {
      throw new ForbiddenException();
    }

    if (actor.roleName === Roles.PARENT) {
      const childIds = await this.getParentChildIds(actor._id);
      const certStudentId = String(cert.studentId);
      if (!childIds.some((id) => String(id) === certStudentId)) {
        throw new ForbiddenException();
      }
    }

    return cert;
  }

  /**
   * Student, parent, or staff updates the Arabic and English names on a certificate.
   */
  async updateName(
    actor: AcademicsActor,
    certificateId: string,
    dto: UpdateCertificateNameDto,
  ): Promise<Certificate> {
    const cert = await this.certModel.findOne({
      _id: oid(certificateId),
      organizationId: oid(actor.organizationId),
    });

    if (!cert) {
      throw new NotFoundException(CertificateErrors.CERTIFICATE_NOT_FOUND);
    }

    if (cert.status === CertificateStatus.ISSUED) {
      throw new ConflictException(CertificateErrors.CERTIFICATE_IMMUTABLE);
    }

    const certStudentId = String(cert.studentId);
    const isStudent = certStudentId === actor._id;
    const isParentOfStudent =
      actor.roleName === Roles.PARENT &&
      (await this.getParentChildIds(actor._id)).some((id) => String(id) === certStudentId);
    if (!isStudent && !isParentOfStudent && !this.isPrivilegedStaff(actor)) {
      throw new ForbiddenException();
    }

    const nameAr = dto.nameAr?.trim();
    const nameEn = dto.nameEn?.trim();

    if (!nameAr || !nameEn) {
      throw new BadRequestException(CertificateErrors.CERTIFICATE_NAME_REQUIRED);
    }

    if (nameAr.length > 100 || nameEn.length > 100) {
      throw new BadRequestException(CertificateErrors.CERTIFICATE_NAME_TOO_LONG);
    }

    cert.nameAr = nameAr;
    cert.nameEn = nameEn;
    return cert.save();
  }

  /**
   * Confirms the reviewed names on the certificate.
   */
  async confirmName(
    actor: AcademicsActor,
    certificateId: string,
  ): Promise<Certificate> {
    const cert = await this.certModel.findOne({
      _id: oid(certificateId),
      organizationId: oid(actor.organizationId),
    });

    if (!cert) {
      throw new NotFoundException(CertificateErrors.CERTIFICATE_NOT_FOUND);
    }

    if (cert.status === CertificateStatus.ISSUED) {
      throw new ConflictException(CertificateErrors.CERTIFICATE_IMMUTABLE);
    }

    const certStudentId2 = String(cert.studentId);
    const isStudent2 = certStudentId2 === actor._id;
    const isParentOfStudent2 =
      actor.roleName === Roles.PARENT &&
      (await this.getParentChildIds(actor._id)).some((id) => String(id) === certStudentId2);
    if (!isStudent2 && !isParentOfStudent2 && !this.isPrivilegedStaff(actor)) {
      throw new ForbiddenException();
    }

    cert.nameConfirmedBy = oid(actor._id);
    cert.nameConfirmedAt = new Date();
    return cert.save();
  }

  /**
   * Issues a certificate: generates atomic serial number, verification token, QR code,
   * and transitions status to ISSUED.
   */
  async issueCertificate(
    actor: AcademicsActor,
    certificateId: string,
  ): Promise<Certificate> {
    const cert = await this.certModel.findOne({
      _id: oid(certificateId),
      organizationId: oid(actor.organizationId),
    });

    if (!cert) {
      throw new NotFoundException(CertificateErrors.CERTIFICATE_NOT_FOUND);
    }

    if (cert.status === CertificateStatus.ISSUED) {
      throw new ConflictException(CertificateErrors.CERTIFICATE_ALREADY_ISSUED);
    }

    if (!cert.nameConfirmedAt) {
      throw new BadRequestException(
        CertificateErrors.CERTIFICATE_NAME_NOT_CONFIRMED,
      );
    }

    if (!cert.eligibility?.isEligible) {
      throw new BadRequestException(CertificateErrors.STUDENT_NOT_ELIGIBLE);
    }

    const org = await this.orgModel.findById(cert.organizationId).lean().exec();
    const currentYear = new Date().getFullYear();

    const seq = await this.counterService.getNextSequence(
      cert.organizationId,
      currentYear,
    );

    const serial = formatCertificateSerial(org?.shortCode, currentYear, seq);

    const verificationToken = crypto.randomBytes(16).toString('base64url');

    const verifyUrl = `${this.getBaseUrl()}/verify/${verificationToken}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 256,
    });

    cert.status = CertificateStatus.ISSUED;
    cert.serial = serial;
    cert.verificationToken = verificationToken;
    cert.issuedBy = oid(actor._id);
    cert.issuedAt = new Date();
    cert.qrCodeDataUrl = qrCodeDataUrl;

    return cert.save();
  }

  /**
   * Public lookup for certificate verification. Returns strictly sanitized data.
   */
  async verifyPublic(token: string): Promise<PublicCertificateVerification> {
    if (!token || typeof token !== 'string') {
      throw new NotFoundException(
        CertificateErrors.INVALID_VERIFICATION_TOKEN,
      );
    }

    const cert = await this.certModel
      .findOne({
        verificationToken: token.trim(),
        status: CertificateStatus.ISSUED,
      })
      .lean()
      .exec();

    if (!cert) {
      throw new NotFoundException(
        CertificateErrors.INVALID_VERIFICATION_TOKEN,
      );
    }

    const [course, level, org] = await Promise.all([
      this.courseModel.findById(cert.courseId).select('name').lean().exec(),
      this.levelModel.findById(cert.levelId).select('name').lean().exec(),
      this.orgModel.findById(cert.organizationId).select('name').lean().exec(),
    ]);

    return {
      studentNameAr: cert.nameAr,
      studentNameEn: cert.nameEn,
      courseName: course?.name ?? '',
      levelName: level?.name ?? '',
      organizationName: org?.name ?? '',
      serial: cert.serial!,
      issuedAt: cert.issuedAt!,
    };
  }
}
