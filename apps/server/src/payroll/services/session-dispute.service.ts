import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DateTime } from 'luxon';
import { AcademicsErrors, CommonErrors, hasAnyRole, PayStatementStatus, PayrollErrors, Roles } from '@darnozom/shared-types';
import { Session } from '../../academics/session/entities/session.entity';
import { PayStatement } from '../entities/pay-statement.entity';
import { Organization } from '../../organization/entities/organization.entity';

const ALLOWED_DISPUTE_ROLES: Roles[] = [Roles.MANAGER, Roles.OWNER, Roles.ADMIN, Roles.ACCOUNTANT, Roles.SUPERVISOR];

export interface DisputeActor {
  _id: string;
  organizationId: string;
  roleName: Roles;
  additionalRoles?: Roles[];
}

@Injectable()
export class SessionDisputeService {
  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<Session>,
    @InjectModel(PayStatement.name)
    private readonly payStatementModel: Model<PayStatement>,
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<Organization>
  ) {}

  private ensureAuthorized(actor: DisputeActor): void {
    if (!hasAnyRole(actor, ALLOWED_DISPUTE_ROLES)) {
      throw new ForbiddenException(CommonErrors.FORBIDDEN);
    }
  }

  private async checkMonthNotFrozen(session: Session, organizationId: Types.ObjectId, teacherId: Types.ObjectId): Promise<void> {
    const org = await this.organizationModel.findById(organizationId);
    const tz = org?.timezone || 'UTC';
    const monthStr = DateTime.fromJSDate(session.startsAt, { zone: tz }).toFormat('yyyy-MM');

    const approvedStatement = await this.payStatementModel.findOne({
      organizationId,
      teacherId,
      month: monthStr,
      status: { $in: [PayStatementStatus.APPROVED, PayStatementStatus.PAID] },
    });

    if (approvedStatement) {
      throw new ConflictException(PayrollErrors.DISPUTE_BLOCKED_MONTH_APPROVED);
    }
  }

  async disputeSession(sessionId: string, reason: string, actor: DisputeActor): Promise<Session> {
    this.ensureAuthorized(actor);

    if (!reason || !reason.trim()) {
      throw new BadRequestException(PayrollErrors.DISPUTE_REASON_REQUIRED);
    }

    const session = await this.sessionModel.findById(sessionId);
    if (!session || session.organizationId.toString() !== actor.organizationId) {
      throw new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND);
    }

    if (session.disputed) {
      throw new ConflictException(PayrollErrors.SESSION_ALREADY_DISPUTED);
    }

    await this.checkMonthNotFrozen(session, session.organizationId, session.teacherId);

    session.disputed = true;
    session.disputeReason = reason.trim();
    session.disputedBy = new Types.ObjectId(actor._id);
    session.disputedAt = new Date();
    session.disputeResolvedBy = undefined;
    session.disputeResolvedAt = undefined;

    await session.save();
    return session;
  }

  async resolveDispute(sessionId: string, actor: DisputeActor): Promise<Session> {
    this.ensureAuthorized(actor);

    const session = await this.sessionModel.findById(sessionId);
    if (!session || session.organizationId.toString() !== actor.organizationId) {
      throw new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND);
    }

    if (!session.disputed) {
      throw new ConflictException(PayrollErrors.SESSION_NOT_DISPUTED);
    }

    await this.checkMonthNotFrozen(session, session.organizationId, session.teacherId);

    session.disputed = false;
    session.disputeResolvedBy = new Types.ObjectId(actor._id);
    session.disputeResolvedAt = new Date();

    await session.save();
    return session;
  }
}
