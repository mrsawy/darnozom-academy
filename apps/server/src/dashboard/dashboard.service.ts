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
  IAdminOverview,
  GroupStudentStatus,
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
import { Program } from '../academics/program/entities/program.entity';
import { Course } from '../course/entities/course.entity';
import { avg, rate, tallySessions, topAndBottom, OverviewSession } from './admin-overview.calc';

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
    @InjectModel(Program.name) private readonly programModel: Model<Program>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
  ) {}

  /** Programme / group / teacher / student picture for the academy home page. */
  async getAdminOverview(orgId: string): Promise<IAdminOverview> {
    const oid = new Types.ObjectId(orgId);
    const [programs, courses, groups, sessionDocs] = await Promise.all([
      this.programModel.find({ organizationId: oid, deletedAt: null }, { name: 1 }).lean(),
      this.courseModel.find({ organizationId: oid, programId: { $ne: null } }, { programId: 1 }).lean(),
      this.groupModel
        .find({ organizationId: oid, deletedAt: null, status: { $ne: GroupStatus.CANCELLED } })
        .select('courseId teacherId status atRisk students.studentId students.status')
        .lean(),
      this.sessionModel
        .find({
          organizationId: oid,
          deletedAt: null,
          status: { $in: [SessionStatus.COMPLETED, SessionStatus.REPORT_PENDING] },
        })
        .select('groupId teacherId attendance.studentId attendance.status report.evaluations')
        .lean(),
    ]);

    const sessions: OverviewSession[] = sessionDocs.map((s) => ({
      groupId: String(s.groupId),
      teacherId: String(s.teacherId),
      attendance: (s.attendance ?? []).map((a) => ({ studentId: String(a.studentId), status: a.status })),
      evaluations: (s.report?.evaluations ?? []).map((e) => ({
        studentId: String(e.studentId),
        participation: e.participation,
        understanding: e.understanding,
        behavior: e.behavior,
        homework: e.homework,
      })),
    }));
    const { byTeacher, byStudent, byGroup } = tallySessions(sessions);

    const programOfCourse = new Map(courses.map((c) => [String(c._id), String(c.programId)]));
    const activeStudentIds = new Set<string>();
    const teacherGroups = new Map<string, number>();
    const teacherStudents = new Map<string, Set<string>>();
    const perProgram = new Map<
      string,
      { groups: number; running: number; students: Set<string>; groupIds: string[] }
    >();
    let runningGroups = 0;
    let atRiskGroups = 0;

    for (const g of groups) {
      const active = (g.students ?? [])
        .filter((st) => st.status === GroupStudentStatus.ACTIVE)
        .map((st) => String(st.studentId));
      const isRunning = g.status === GroupStatus.RUNNING;
      if (isRunning) runningGroups += 1;
      if (g.atRisk) atRiskGroups += 1;
      active.forEach((id) => activeStudentIds.add(id));
      if (g.teacherId) {
        const tid = String(g.teacherId);
        teacherGroups.set(tid, (teacherGroups.get(tid) ?? 0) + 1);
        const set = teacherStudents.get(tid) ?? new Set<string>();
        active.forEach((id) => set.add(id));
        teacherStudents.set(tid, set);
      }
      const pid = programOfCourse.get(String(g.courseId));
      if (pid) {
        const p = perProgram.get(pid) ?? { groups: 0, running: 0, students: new Set<string>(), groupIds: [] };
        p.groups += 1;
        if (isRunning) p.running += 1;
        active.forEach((id) => p.students.add(id));
        p.groupIds.push(String(g._id));
        perProgram.set(pid, p);
      }
    }

    const teacherIds = [...teacherGroups.keys()];
    const studentRows = [...byStudent.entries()].filter(([, t]) => t.scoreCount > 0);
    const nameIds = [...new Set([...teacherIds, ...studentRows.map(([id]) => id)])];
    const users = nameIds.length
      ? await this.userModel
          .find(
            { _id: { $in: nameIds.map((id) => new Types.ObjectId(id)) } },
            { firstName: 1, lastName: 1, username: 1 },
          )
          .lean()
      : [];
    const nameOf = new Map(
      users.map((u) => [String(u._id), `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username]),
    );

    const teacherStats = teacherIds.map((id) => {
      const t = byTeacher.get(id);
      return {
        teacherId: id,
        name: nameOf.get(id) ?? id,
        groups: teacherGroups.get(id) ?? 0,
        students: teacherStudents.get(id)?.size ?? 0,
        avgScore: t ? avg(t) : null,
        attendanceRate: t ? rate(t) : null,
      };
    });
    const studentStats = studentRows.map(([id, t]) => ({
      studentId: id,
      name: nameOf.get(id) ?? id,
      avgScore: avg(t) as number,
      attendanceRate: rate(t),
    }));
    const teachers = topAndBottom(teacherStats, 3);
    const students = topAndBottom(studentStats, 5);

    return {
      totals: {
        programs: programs.length,
        runningGroups,
        activeStudents: activeStudentIds.size,
        teachers: teacherIds.length,
        atRiskGroups,
      },
      programs: programs
        .map((p) => {
          const agg = perProgram.get(String(p._id));
          let attended = 0;
          let counted = 0;
          for (const gid of agg?.groupIds ?? []) {
            const t = byGroup.get(gid);
            if (t) {
              attended += t.attended;
              counted += t.counted;
            }
          }
          return {
            programId: String(p._id),
            name: p.name,
            groups: agg?.groups ?? 0,
            runningGroups: agg?.running ?? 0,
            students: agg?.students.size ?? 0,
            attendanceRate: counted === 0 ? null : Math.round((attended / counted) * 100),
          };
        })
        .sort((a, b) => b.students - a.students),
      topTeachers: teachers.top,
      bottomTeachers: teachers.bottom,
      topStudents: students.top,
      bottomStudents: students.bottom,
    };
  }

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
    // A parent isn't tied to one organization, so an empty orgId means "across all of their children's orgs".
    const orgFilter = orgId ? { organizationId: new Types.ObjectId(orgId) } : {};
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
            ...orgFilter,
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
            ...orgFilter,
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
            ...orgFilter,
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
            ...orgFilter,
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
