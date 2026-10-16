import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IAdminDashboardCounts,
  ITeacherDashboardData,
  IParentDashboardData,
  IParentChildCard,
  ITeacherSession,
  IGroupCard,
  ILatestEvaluation,
  IActionItem,
  IBalanceEntry,
  GroupStatus,
  SessionStatus,
  TaskStatus,
  FamilyPaymentState,
  ShariaStatus,
  PayStatementStatus,
  CertificateStatus,
  LedgerEntryType,
} from '@darnozom/shared-types';
import { Group } from '../academics/group/entities/group.entity';
import { Session } from '../academics/session/entities/session.entity';
import { Task } from '../academics/task/entities/task.entity';
import { CourseContent } from '../course/entities/course-content.entity';
import { FamilyPayment } from '../billing/entities/payment.entity';
import { LedgerEntry } from '../billing/entities/ledger-entry.entity';
import { PayStatement } from '../payroll/entities/pay-statement.entity';
import { Certificate } from '../certificate/entities/certificate.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(CourseContent.name) private readonly courseContentModel: Model<CourseContent>,
    @InjectModel(FamilyPayment.name) private readonly familyPaymentModel: Model<FamilyPayment>,
    @InjectModel(LedgerEntry.name) private readonly ledgerEntryModel: Model<LedgerEntry>,
    @InjectModel(PayStatement.name) private readonly payStatementModel: Model<PayStatement>,
    @InjectModel(Certificate.name) private readonly certificateModel: Model<Certificate>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async getAdminCounts(
    _userId: string,
    orgId: string,
    _userSubjectPermissions: string[],
  ): Promise<IAdminDashboardCounts> {
    const oid = new Types.ObjectId(orgId);

    const [
      groupsByStatus,
      atRiskGroups,
      todaySessions,
      openTasks,
      overdueTasks,
      contentAwaitingShariaReview,
      receiptsAwaitingReview,
      outstandingBalance,
      payStatementsAwaitingApproval,
      certificatesAwaitingReview,
    ] = await Promise.all([
      this.groupModel.aggregate<{ _id: string; count: number }>([
        { $match: { organizationId: oid, deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.groupModel.countDocuments({ organizationId: oid, atRisk: true, deletedAt: null }),
      this.sessionModel.aggregate<{ _id: string; count: number }>([
        { $match: { organizationId: oid, startsAt: this._todayRange(), deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.taskModel.countDocuments({ organizationId: oid, status: TaskStatus.OPEN }),
      this.taskModel.countDocuments({ organizationId: oid, status: TaskStatus.OPEN, dueAt: { $lt: new Date() } }),
      this.courseContentModel.countDocuments({ organizationId: oid, shariaStatus: ShariaStatus.PENDING, deletedAt: null }),
      this.familyPaymentModel.countDocuments({ organizationId: oid, status: FamilyPaymentState.PENDING_REVIEW }),
      this._outstandingBalance(oid),
      this.payStatementModel.countDocuments({ organizationId: oid, status: PayStatementStatus.DRAFT }),
      this.certificateModel.countDocuments({ organizationId: oid, status: CertificateStatus.NAME_REVIEW }),
    ]);

    return {
      groupsByStatus: Object.fromEntries(groupsByStatus.map((g) => [g._id, g.count])),
      atRiskGroups,
      todaySessions: Object.fromEntries(todaySessions.map((s) => [s._id, s.count])),
      openTasks,
      overdueTasks,
      contentAwaitingShariaReview,
      receiptsAwaitingReview,
      outstandingBalance,
      payStatementsAwaitingApproval,
      certificatesAwaitingReview,
    };
  }

  async getTeacherDashboard(teacherId: string, orgId: string): Promise<ITeacherDashboardData> {
    const oid = new Types.ObjectId(orgId);
    const tid = new Types.ObjectId(teacherId);
    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + 8);

    const sessions = await this.sessionModel
      .find({
        organizationId: oid,
        teacherId: tid,
        startsAt: { $gte: now, $lt: windowEnd },
        deletedAt: null,
      })
      .sort({ startsAt: 1 })
      .lean();

    const groupIds = [...new Set(sessions.map((s) => String(s.groupId)))];
    const groups =
      groupIds.length > 0
        ? await this.groupModel.find({ _id: { $in: groupIds.map((id) => new Types.ObjectId(id)) } }, { name: 1 }).lean()
        : [];
    const groupNameMap = Object.fromEntries(groups.map((g) => [String(g._id), g.name]));

    const teacherSessions: ITeacherSession[] = sessions.map((s) => ({
      _id: String(s._id),
      groupId: String(s.groupId),
      groupName: groupNameMap[String(s.groupId)] ?? '',
      startsAt: (s.startsAt as Date).toISOString(),
      status: s.status,
      sessionNumber: (s as unknown as { sequence?: number }).sequence ?? 0,
      actionLabel: this._teacherActionLabel(s.status as string),
    }));

    return { sessions: teacherSessions };
  }

  async getParentDashboard(parentId: string, orgId: string): Promise<IParentDashboardData> {
    const oid = new Types.ObjectId(orgId);
    const pid = new Types.ObjectId(parentId);
    const parentUser = await this.userModel.findById(pid).lean();
    const childIds = (parentUser?.childUsersIds ?? []).map((id) => new Types.ObjectId(String(id)));

    const children = await this.userModel
      .find({
        $or: [
          ...(childIds.length > 0 ? [{ _id: { $in: childIds } }] : []),
          { parentUserId: pid },
        ],
        deletedAt: null,
      })
      .lean();

    if (children.length === 0) {
      return { children: [] };
    }

    const now = new Date();

    const childCards: IParentChildCard[] = await Promise.all(
      children.map(async (child) => {
        const studentOid = new Types.ObjectId(String(child._id));

        // 1. Groups enrolled in this organization
        const groups = await this.groupModel
          .find({
            organizationId: oid,
            'students.studentId': studentOid,
            deletedAt: null,
          })
          .lean();

        const groupCards: IGroupCard[] = await Promise.all(
          groups.map(async (g) => {
            const nextSession = await this.sessionModel
              .findOne({
                groupId: g._id,
                startsAt: { $gte: now },
                deletedAt: null,
              })
              .sort({ startsAt: 1 })
              .lean();

            return {
              groupId: String(g._id),
              groupName: g.name,
              nextSession: nextSession
                ? {
                    _id: String(nextSession._id),
                    groupId: String(g._id),
                    groupName: g.name,
                    startsAt: (nextSession.startsAt as Date).toISOString(),
                    status: nextSession.status,
                    sessionNumber: (nextSession as unknown as { sequence?: number }).sequence ?? 0,
                  }
                : null,
            };
          })
        );

        // 2. Latest session report evaluation
        const latestSessionWithReport = await this.sessionModel
          .findOne({
            organizationId: oid,
            'report.evaluations.studentId': studentOid,
            deletedAt: null,
          })
          .sort({ startsAt: -1 })
          .lean();

        let latestEvaluation: ILatestEvaluation | null = null;
        if (latestSessionWithReport?.report?.evaluations) {
          const ev = latestSessionWithReport.report.evaluations.find(
            (e) => String(e.studentId) === String(child._id)
          );
          if (ev) {
            latestEvaluation = {
              sessionId: String(latestSessionWithReport._id),
              sessionNumber: (latestSessionWithReport as unknown as { sequence?: number }).sequence ?? 0,
              scores: {
                participation: ev.participation,
                understanding: ev.understanding,
                behavior: ev.behavior,
                homework: ev.homework,
              },
              comment: ev.note,
            };
          }
        }

        // 3. Action items
        const actionItems: IActionItem[] = [];

        // Check for certificate name review
        const certNeedingReview = await this.certificateModel
          .findOne({
            organizationId: oid,
            studentId: studentOid,
            status: CertificateStatus.NAME_REVIEW,
          })
          .lean();

        if (certNeedingReview) {
          actionItems.push({
            type: 'CERT_NAME_REVIEW',
            certificateId: String(certNeedingReview._id),
            groupId: String(certNeedingReview.groupId),
          });
        }

        // Check for rejected payment receipts
        const rejectedPayment = await this.familyPaymentModel
          .findOne({
            organizationId: oid,
            familyId: pid,
            status: FamilyPaymentState.REJECTED,
          })
          .lean();

        if (rejectedPayment) {
          actionItems.push({
            type: 'RECEIPT_REJECTED',
            familyPaymentId: String(rejectedPayment._id),
          });
        }

        return {
          studentId: String(child._id),
          studentName: `${child.firstName ?? ''} ${child.lastName ?? ''}`.trim() || child.username,
          groupCards,
          latestEvaluation,
          actionItems,
        };
      })
    );

    return { children: childCards };
  }

  private _todayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { $gte: start, $lt: end };
  }

  private _teacherActionLabel(status: string): ITeacherSession['actionLabel'] {
    if (status === SessionStatus.SCHEDULED) return 'TAKE_ATTENDANCE';
    if (status === SessionStatus.REPORT_PENDING) return 'SUBMIT_REPORT';
    return null;
  }

  private async _outstandingBalance(oid: Types.ObjectId): Promise<IBalanceEntry[]> {
    const rows = await this.ledgerEntryModel.aggregate<{
      _id: { currency: string; type: LedgerEntryType };
      total: number;
    }>([
      { $match: { organizationId: oid } },
      {
        $group: {
          _id: { currency: '$currency', type: '$type' },
          total: { $sum: { $multiply: ['$amountMinor', '$direction'] } },
        },
      },
    ]);

    const balanceMap = new Map<string, number>();
    for (const row of rows) {
      const current = balanceMap.get(row._id.currency) ?? 0;
      if (row._id.type === LedgerEntryType.CHARGE || row._id.type === LedgerEntryType.ADJUSTMENT) {
        balanceMap.set(row._id.currency, current + row.total);
      } else if (row._id.type === LedgerEntryType.PAYMENT) {
        balanceMap.set(row._id.currency, current - row.total);
      }
    }

    return Array.from(balanceMap.entries())
      .filter(([_, amount]) => amount > 0)
      .map(([currency, amount]) => ({ currency, amount }));
  }
}
