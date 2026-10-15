import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { GroupStudentStatus, hasAnyRole, LedgerEntryType, PayStatementStatus, PayrollErrors, Roles } from '@darnozom/shared-types';
import { PayStatement } from '../entities/pay-statement.entity';
import { TeacherPayProfileService } from './teacher-pay-profile.service';
import { Session } from '../../academics/session/entities/session.entity';
import { Group } from '../../academics/group/entities/group.entity';
import { LedgerEntry } from '../../billing/entities/ledger-entry.entity';
import { Allocation } from '../../billing/entities/allocation.entity';
import { Organization } from '../../organization/entities/organization.entity';
import { AddBonusDto, MarkPaidDto } from '../dto/payroll.dto';
import { calculateBaseAmount, calculateTotal, getMonthInterval, isSessionCountable } from '../domain/payroll-calculator';
import { DisputeActor } from './session-dispute.service';

const STAFF_ROLES: Roles[] = [Roles.ADMIN, Roles.OWNER, Roles.MANAGER, Roles.ACCOUNTANT, Roles.SUPER_ADMIN];

@Injectable()
export class PayrollService {
  constructor(
    @InjectModel(PayStatement.name)
    private readonly statementModel: Model<PayStatement>,
    private readonly profileService: TeacherPayProfileService,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<Session>,
    @InjectModel(Group.name)
    private readonly groupModel: Model<Group>,
    @InjectModel(LedgerEntry.name)
    private readonly ledgerEntryModel: Model<LedgerEntry>,
    @InjectModel(Allocation.name)
    private readonly allocationModel: Model<Allocation>,
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<Organization>
  ) {}

  async generateStatements(organizationId: string, month: string): Promise<PayStatement[]> {
    const orgOid = new Types.ObjectId(organizationId);
    const org = await this.organizationModel.findById(orgOid);
    const tz = org?.timezone || 'UTC';

    const monthInterval = getMonthInterval(month, tz);
    const profiles = await this.profileService.getProfiles(organizationId);

    const generated: PayStatement[] = [];

    for (const p of profiles) {
      const teacherOid = new Types.ObjectId(p.teacherId);

      // Check existing statement
      const existing = await this.statementModel.findOne({
        organizationId: orgOid,
        teacherId: teacherOid,
        month,
      });

      if (existing && (existing.status === PayStatementStatus.APPROVED || existing.status === PayStatementStatus.PAID)) {
        // Untouched
        continue;
      }

      // Find effective profile on the first day of that month
      const effectiveProfile = await this.profileService.findEffectiveProfile(organizationId, p.teacherId.toString(), monthInterval.start);

      if (!effectiveProfile) {
        continue;
      }

      // Query sessions for teacher in the month interval
      const sessions = await this.sessionModel.find({
        organizationId: orgOid,
        teacherId: teacherOid,
        startsAt: { $gte: monthInterval.start, $lt: monthInterval.end },
      });

      const countableSessions = sessions.filter((s) => isSessionCountable(s, teacherOid.toString(), monthInterval));

      const countedSessionIds = countableSessions.map((s) => s._id);

      // Calculate basis
      const sessionsCount = countableSessions.length;

      let totalMinutes = 0;
      const groupIds = new Set<string>();

      for (const s of countableSessions) {
        const startMs = s.startsAt.getTime();
        const endMs = s.endsAt ? s.endsAt.getTime() : startMs;
        const durationMins = Math.max(0, Math.round((endMs - startMs) / 60_000));
        totalMinutes += durationMins;
        groupIds.add(s.groupId.toString());
      }

      // Distinct active students across teacher's groups
      let distinctStudentsCount = 0;
      if (groupIds.size > 0) {
        const groups = await this.groupModel.find({
          _id: { $in: [...groupIds].map((id) => new Types.ObjectId(id)) },
        });

        const studentIds = new Set<string>();
        for (const g of groups) {
          if (Array.isArray(g.students)) {
            for (const st of g.students) {
              if (st.status === GroupStudentStatus.ACTIVE) {
                studentIds.add(st.studentId.toString());
              }
            }
          }
        }
        distinctStudentsCount = studentIds.size;
      }

      // Revenue share: allocations in the month for charges on teacher's groups
      let totalRevenue = 0;
      if (groupIds.size > 0) {
        const charges =
          (await this.ledgerEntryModel.find({
            organizationId: orgOid,
            groupId: { $in: [...groupIds].map((id) => new Types.ObjectId(id)) },
            type: LedgerEntryType.CHARGE,
          })) || [];

        const chargeIds = charges.map((c) => c._id);
        if (chargeIds.length > 0) {
          const allocations =
            (await this.allocationModel.find({
              organizationId: orgOid,
              chargeId: { $in: chargeIds },
              currency: effectiveProfile.currency,
              createdAt: { $gte: monthInterval.start, $lt: monthInterval.end },
            })) || [];

          const revenueMinor = allocations.reduce((acc, a) => acc + (a.amountMinor || 0), 0);
          totalRevenue = revenueMinor / 100;
        }
      }

      const basis = {
        sessions: sessionsCount,
        minutes: totalMinutes,
        students: distinctStudentsCount,
        revenue: totalRevenue,
      };

      const baseAmount = calculateBaseAmount(effectiveProfile.model, effectiveProfile.rate, basis);

      const bonuses = existing?.bonuses ?? [];
      const total = calculateTotal(baseAmount, bonuses);

      const profileSnapshot = {
        model: effectiveProfile.model,
        rate: effectiveProfile.rate,
        currency: effectiveProfile.currency,
      };

      if (existing) {
        existing.profileSnapshot = profileSnapshot;
        existing.countedSessionIds = countedSessionIds;
        existing.basis = basis;
        existing.baseAmount = baseAmount;
        existing.total = total;
        await existing.save();
        generated.push(existing);
      } else {
        const created = await this.statementModel.create({
          organizationId: orgOid,
          teacherId: teacherOid,
          month,
          profileSnapshot,
          countedSessionIds,
          basis,
          baseAmount,
          bonuses: [],
          total,
          status: PayStatementStatus.DRAFT,
        });
        generated.push(created);
      }
    }

    return generated;
  }

  async addBonus(statementId: string, dto: AddBonusDto, actorId: string): Promise<PayStatement> {
    if (dto.amount <= 0) {
      throw new BadRequestException(PayrollErrors.BONUS_AMOUNT_INVALID);
    }

    const statement = await this.statementModel.findById(statementId);
    if (!statement) {
      throw new NotFoundException(PayrollErrors.STATEMENT_NOT_FOUND);
    }

    if (statement.status !== PayStatementStatus.DRAFT) {
      throw new ConflictException(PayrollErrors.STATEMENT_ALREADY_APPROVED);
    }

    statement.bonuses = statement.bonuses || [];
    statement.bonuses.push({
      amount: dto.amount,
      reason: dto.reason.trim(),
      addedBy: new Types.ObjectId(actorId),
      addedAt: new Date(),
    });

    statement.total = calculateTotal(statement.baseAmount, statement.bonuses);
    await statement.save();
    return statement;
  }

  async approveStatement(statementId: string, actorId: string): Promise<PayStatement> {
    const statement = await this.statementModel.findById(statementId);
    if (!statement) {
      throw new NotFoundException(PayrollErrors.STATEMENT_NOT_FOUND);
    }

    if (statement.status !== PayStatementStatus.DRAFT) {
      throw new ConflictException(PayrollErrors.STATEMENT_ALREADY_APPROVED);
    }

    statement.status = PayStatementStatus.APPROVED;
    statement.approvedBy = new Types.ObjectId(actorId);
    statement.approvedAt = new Date();

    await statement.save();
    return statement;
  }

  async markPaid(statementId: string, dto: MarkPaidDto, actorId: string): Promise<PayStatement> {
    const statement = await this.statementModel.findById(statementId);
    if (!statement) {
      throw new NotFoundException(PayrollErrors.STATEMENT_NOT_FOUND);
    }

    if (statement.status === PayStatementStatus.DRAFT) {
      throw new ConflictException(PayrollErrors.STATEMENT_NOT_APPROVED);
    }

    if (statement.status === PayStatementStatus.PAID) {
      throw new ConflictException(PayrollErrors.STATEMENT_ALREADY_PAID);
    }

    statement.status = PayStatementStatus.PAID;
    statement.paidBy = new Types.ObjectId(actorId);
    statement.paidAt = new Date();
    if (dto.paymentReference) {
      statement.paymentReference = dto.paymentReference.trim();
    }

    await statement.save();
    return statement;
  }

  async findStatements(
    organizationId: string,
    query: { month?: string; teacherId?: string; status?: PayStatementStatus },
    actor: DisputeActor
  ): Promise<PayStatement[]> {
    const orgOid = new Types.ObjectId(organizationId);
    const filter: FilterQuery<PayStatement> = { organizationId: orgOid };

    if (hasAnyRole(actor, STAFF_ROLES)) {
      if (query.teacherId) {
        filter.teacherId = new Types.ObjectId(query.teacherId);
      }
      if (query.status) {
        filter.status = query.status;
      }
    } else {
      // Instructor view: only own statements, and only approved or paid
      filter.teacherId = new Types.ObjectId(actor._id);
      filter.status = { $in: [PayStatementStatus.APPROVED, PayStatementStatus.PAID] };
    }

    if (query.month) {
      filter.month = query.month;
    }

    // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort
    return this.statementModel.find(filter).sort({ month: -1, createdAt: -1 });
  }

  async getStatementById(statementId: string, actor: DisputeActor): Promise<PayStatement> {
    const statement = await this.statementModel.findById(statementId);
    if (!statement || statement.organizationId.toString() !== actor.organizationId) {
      throw new NotFoundException(PayrollErrors.STATEMENT_NOT_FOUND);
    }

    if (
      !hasAnyRole(actor, STAFF_ROLES) && // Must be own statement and approved or paid
      (statement.teacherId.toString() !== actor._id || statement.status === PayStatementStatus.DRAFT)
    ) {
      throw new NotFoundException(PayrollErrors.STATEMENT_NOT_FOUND);
    }

    return statement;
  }
}
