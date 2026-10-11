import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import {
  AccessType,
  type EnrollmentTrendSeriesPoint,
  type LearningActivityPoint,
  type OrganizationDashboardReports,
  type OrganizationDashboardReportsSummary,
  type ReportsPieSlice,
  type RevenueTrendPoint,
  type StudentDashboardReports,
  type StudentDashboardReportsQuiz,
  type StudentDashboardReportsSummary,
  type TimeSpentPerCourse,
  type TopCourseReport,
} from '@darnozom/shared-types';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';

export interface OrganizationDashboardAggregationExtras {
  totalRevenue: number;
  revenueByCourseId: Map<string, number>;
  transactions: { createdAt?: Date; netAmount?: number }[];
  activeLearnersDateFrom?: Date;
}

/**
 * Shared enrollment → dashboard DTO aggregation for student, organization, and instructor reports.
 */
@Injectable()
export class ReportsAggregationService {
  aggregateStudentDashboard(enrollments: Enrollment[]): StudentDashboardReports {
    const assignmentAvgScore = this.buildAssignmentAvgScore(enrollments);
    const summary = this.buildSummary(enrollments, assignmentAvgScore);
    const contentTypeDistribution = this.buildContentTypeDistribution(enrollments);
    const attendanceDistribution = this.buildAttendanceDistribution(enrollments);
    const quiz = this.buildQuizOverview(enrollments);
    const courseProgress = this.buildCourseProgress(enrollments);
    const quizScoresOverTime = this.buildQuizScoresOverTime(enrollments);
    const timeSpentPerCourse = this.buildTimeSpentPerCourse(enrollments);
    const learningActivityOverTime = this.buildLearningActivityOverTime(enrollments);
    const accessTypeDistribution = this.buildStudentAccessTypeDistribution(enrollments);

    return {
      summary,
      contentTypeDistribution,
      attendanceDistribution,
      quiz,
      courseProgress,
      quizScoresOverTime,
      timeSpentPerCourse,
      learningActivityOverTime,
      accessTypeDistribution,
    };
  }

  aggregateOrganizationDashboard(enrollments: Enrollment[], extras: OrganizationDashboardAggregationExtras): OrganizationDashboardReports {
    const summary = this.buildOrganizationSummary(enrollments, extras);
    const contentTypeDistribution = this.buildContentTypeDistribution(enrollments);
    const attendanceDistribution = this.buildAttendanceDistribution(enrollments);
    const quiz = this.buildQuizOverview(enrollments);
    const courseProgress = this.buildOrganizationCourseProgress(enrollments);
    const quizScoresOverTime = this.buildQuizScoresOverTime(enrollments);
    const enrollmentTrends = this.buildEnrollmentTrends(enrollments);
    const topCourses = this.buildTopCourses(enrollments, extras.revenueByCourseId);
    const revenueOverTime = this.buildRevenueOverTime(extras.transactions);
    const accessTypeDistribution = this.buildOrgAccessTypeDistribution(enrollments);

    return {
      summary,
      contentTypeDistribution,
      attendanceDistribution,
      quiz,
      courseProgress,
      quizScoresOverTime,
      enrollmentTrends,
      topCourses,
      revenueOverTime,
      accessTypeDistribution,
    };
  }

  private isEnrollmentCompleted(e: Enrollment): boolean {
    const courseId = e.courseId;
    const completedList = e.progress?.completedCourses ?? [];
    return e.completedAt != null || (!!courseId && completedList.some((id) => new mongoose.Types.ObjectId(id).equals(courseId)));
  }

  private buildOrganizationSummary(enrollments: Enrollment[], extras: OrganizationDashboardAggregationExtras): OrganizationDashboardReportsSummary {
    const totalRevenueRounded = Math.round(extras.totalRevenue * 100) / 100;
    const totalEnrollments = enrollments.length;
    if (totalEnrollments === 0) {
      return {
        totalEnrollments: 0,
        uniqueLearners: 0,
        completedEnrollments: 0,
        averageProgressPercentage: 0,
        totalTimeSpentMinutes: 0,
        activeLearnersCount: 0,
        completionRate: 0,
        totalRevenue: totalRevenueRounded,
        freeEnrollments: 0,
        paidEnrollments: 0,
      };
    }

    const userIds = new Set<string>();
    const activeUserIds = new Set<string>();
    let completedEnrollments = 0;
    let sumProgress = 0;
    let totalTimeSpentMinutes = 0;
    let freeEnrollments = 0;
    let paidEnrollments = 0;
    const from = extras.activeLearnersDateFrom;

    for (const e of enrollments) {
      userIds.add(e.userId.toString());
      sumProgress += e.progressPercentage ?? 0;
      totalTimeSpentMinutes += e.timeSpentMinutes ?? 0;

      if (e.accessType === AccessType.FREE) {
        freeEnrollments += 1;
      } else {
        paidEnrollments += 1;
      }

      if (e.lastAccessedAt && (!from || new Date(e.lastAccessedAt) >= from)) {
        activeUserIds.add(e.userId.toString());
      }

      if (this.isEnrollmentCompleted(e)) {
        completedEnrollments += 1;
      }
    }

    const activeLearnersCount = from ? activeUserIds.size : userIds.size;

    return {
      totalEnrollments,
      uniqueLearners: userIds.size,
      completedEnrollments,
      averageProgressPercentage: Math.round((sumProgress / totalEnrollments) * 10) / 10,
      totalTimeSpentMinutes,
      activeLearnersCount,
      completionRate: Math.round((completedEnrollments / totalEnrollments) * 1000) / 10,
      totalRevenue: totalRevenueRounded,
      freeEnrollments,
      paidEnrollments,
    };
  }

  private buildOrganizationCourseProgress(enrollments: Enrollment[]) {
    const byCourse = new Map<string, { sum: number; count: number; courseName: string }>();

    for (const e of enrollments) {
      const cid = e.courseId?.toString();
      if (!cid) continue;

      const title = (e.courseTitle ?? '').trim() || 'Course';
      const existing = byCourse.get(cid);
      const progress = e.progressPercentage ?? 0;

      if (existing) {
        existing.sum += progress;
        existing.count += 1;
        if (title !== 'Course') {
          existing.courseName = title;
        }
      } else {
        byCourse.set(cid, { sum: progress, count: 1, courseName: title });
      }
    }

    return [...byCourse.values()]
      .map(({ sum, count, courseName }) => ({
        courseName,
        progressPercentage: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
      }))
      .toSorted((a, b) => b.progressPercentage - a.progressPercentage)
      .slice(0, 5);
  }

  private buildAssignmentAvgScore(enrollments: Enrollment[]): number | null {
    const scores: number[] = [];
    for (const e of enrollments) {
      for (const s of e.progress?.assignmentSubmissions ?? []) {
        if (typeof s.score === 'number' && !Number.isNaN(s.score)) {
          scores.push(s.score);
        }
      }
    }
    if (scores.length === 0) {
      return null;
    }
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round((sum / scores.length) * 10) / 10;
  }

  private buildSummary(enrollments: Enrollment[], assignmentAvgScore: number | null): StudentDashboardReportsSummary {
    const enrolledCount = enrollments.length;
    if (enrolledCount === 0) {
      return {
        enrolledCount: 0,
        completedCoursesCount: 0,
        averageProgressPercentage: 0,
        totalTimeSpentMinutes: 0,
        inProgressCount: 0,
        assignmentAvgScore,
      };
    }

    let completedCoursesCount = 0;
    let sumProgress = 0;
    let totalTimeSpentMinutes = 0;

    for (const e of enrollments) {
      sumProgress += e.progressPercentage ?? 0;
      totalTimeSpentMinutes += e.timeSpentMinutes ?? 0;

      if (this.isEnrollmentCompleted(e)) {
        completedCoursesCount += 1;
      }
    }

    return {
      enrolledCount,
      completedCoursesCount,
      averageProgressPercentage: Math.round((sumProgress / enrolledCount) * 10) / 10,
      totalTimeSpentMinutes,
      inProgressCount: enrolledCount - completedCoursesCount,
      assignmentAvgScore,
    };
  }

  private buildEnrollmentTrends(enrollments: Enrollment[]): EnrollmentTrendSeriesPoint[] {
    const counts = new Map<string, { date: string; courseId: string; courseName: string; count: number }>();
    for (const e of enrollments) {
      if (!e.enrolledAt) continue;
      const cid = e.courseId?.toString();
      if (!cid) continue;
      const d = new Date(e.enrolledAt).toISOString().split('T')[0];
      const title = (e.courseTitle ?? '').trim() || 'Course';
      const key = `${d}|${cid}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
        if (title !== 'Course') {
          existing.courseName = title;
        }
      } else {
        counts.set(key, { date: d, courseId: cid, courseName: title, count: 1 });
      }
    }
    return [...counts.values()].toSorted((a, b) => a.date.localeCompare(b.date) || a.courseId.localeCompare(b.courseId));
  }

  private buildTopCourses(enrollments: Enrollment[], revenueByCourseId: Map<string, number>): TopCourseReport[] {
    const byCourse = new Map<string, { courseName: string; list: Enrollment[] }>();

    for (const e of enrollments) {
      const cid = e.courseId?.toString();
      if (!cid) continue;
      const title = (e.courseTitle ?? '').trim() || 'Course';
      const existing = byCourse.get(cid);
      if (existing) {
        existing.list.push(e);
        if (title !== 'Course') {
          existing.courseName = title;
        }
      } else {
        byCourse.set(cid, { courseName: title, list: [e] });
      }
    }

    const rows: TopCourseReport[] = [];
    for (const [courseId, { courseName, list }] of byCourse) {
      const enrollmentCount = list.length;
      let completed = 0;
      let sumProg = 0;
      for (const e of list) {
        if (this.isEnrollmentCompleted(e)) {
          completed += 1;
        }
        sumProg += e.progressPercentage ?? 0;
      }
      rows.push({
        courseId,
        courseName,
        enrollmentCount,
        completionRate: enrollmentCount > 0 ? Math.round((completed / enrollmentCount) * 1000) / 10 : 0,
        avgProgress: enrollmentCount > 0 ? Math.round((sumProg / enrollmentCount) * 10) / 10 : 0,
        revenue: Math.round((revenueByCourseId.get(courseId) ?? 0) * 100) / 100,
      });
    }

    return rows.toSorted((a, b) => b.enrollmentCount - a.enrollmentCount).slice(0, 5);
  }

  private buildRevenueOverTime(transactions: { createdAt?: Date; netAmount?: number }[]): RevenueTrendPoint[] {
    const counts = new Map<string, number>();
    for (const t of transactions) {
      if (!t.createdAt) continue;
      const amt = typeof t.netAmount === 'number' && !Number.isNaN(t.netAmount) ? t.netAmount : 0;
      const d = new Date(t.createdAt).toISOString().split('T')[0];
      counts.set(d, (counts.get(d) ?? 0) + amt);
    }
    return [...counts.entries()]
      .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
      .toSorted((a, b) => a.date.localeCompare(b.date));
  }

  private buildOrgAccessTypeDistribution(enrollments: Enrollment[]): ReportsPieSlice[] {
    let free = 0;
    let paid = 0;
    for (const e of enrollments) {
      if (e.accessType === AccessType.FREE) {
        free += 1;
      } else {
        paid += 1;
      }
    }
    const counts = new Map<string, number>([
      ['free', free],
      ['paid', paid],
    ]);
    return this.mapCountsToSlices(counts, (key) => key);
  }

  private buildStudentAccessTypeDistribution(enrollments: Enrollment[]): ReportsPieSlice[] {
    const counts = new Map<string, number>();
    for (const e of enrollments) {
      const key = (e.accessType ?? 'unknown').toString();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return this.mapCountsToSlices(counts, (key) => this.formatAccessTypeLabel(key));
  }

  private formatAccessTypeLabel(key: string): string {
    if (key === 'unknown') return 'Unknown';
    const spaced = key.replaceAll(/[_-]+/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
  }

  private buildTimeSpentPerCourse(enrollments: Enrollment[]): TimeSpentPerCourse[] {
    const byCourse = new Map<string, { courseName: string; minutes: number }>();

    for (const e of enrollments) {
      const cid = e.courseId?.toString();
      if (!cid) continue;
      const title = (e.courseTitle ?? '').trim() || 'Course';
      const m = e.timeSpentMinutes ?? 0;
      const existing = byCourse.get(cid);
      if (existing) {
        existing.minutes += m;
        if (title !== 'Course') {
          existing.courseName = title;
        }
      } else {
        byCourse.set(cid, { courseName: title, minutes: m });
      }
    }

    return [...byCourse.values()]
      .map(({ courseName, minutes }) => ({ courseName, timeMinutes: minutes }))
      .toSorted((a, b) => b.timeMinutes - a.timeMinutes)
      .slice(0, 5);
  }

  private buildLearningActivityOverTime(enrollments: Enrollment[]): LearningActivityPoint[] {
    const counts = new Map<string, number>();
    for (const e of enrollments) {
      for (const item of e.progress?.contentTimeTracking ?? []) {
        if (!item.lastAccessedAt) continue;
        const d = new Date(item.lastAccessedAt).toISOString().split('T')[0];
        counts.set(d, (counts.get(d) ?? 0) + 1);
      }
    }
    return [...counts.entries()].map(([date, contentCount]) => ({ date, contentCount })).toSorted((a, b) => a.date.localeCompare(b.date));
  }

  private buildContentTypeDistribution(enrollments: Enrollment[]): ReportsPieSlice[] {
    const counts = new Map<string, number>();

    for (const e of enrollments) {
      const items = e.progress?.contentTimeTracking ?? [];
      for (const item of items) {
        const raw = (item.contentType ?? 'unknown').trim() || 'unknown';
        counts.set(raw, (counts.get(raw) ?? 0) + 1);
      }
    }

    return this.mapCountsToSlices(counts, (key) => this.formatContentTypeLabel(key));
  }

  private buildAttendanceDistribution(enrollments: Enrollment[]): ReportsPieSlice[] {
    let attended = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    for (const e of enrollments) {
      const a = e.attendanceSummary;
      if (!a) continue;
      attended += a.attended ?? 0;
      absent += a.absent ?? 0;
      late += a.late ?? 0;
      excused += a.excused ?? 0;
    }

    const counts = new Map<string, number>([
      ['attended', attended],
      ['absent', absent],
      ['late', late],
      ['excused', excused],
    ]);

    return this.mapCountsToSlices(counts, (key) => key);
  }

  private mapCountsToSlices(counts: Map<string, number>, labelForKey: (key: string) => string): ReportsPieSlice[] {
    const slices: ReportsPieSlice[] = [];
    for (const [key, value] of counts) {
      if (value <= 0) continue;
      slices.push({
        key,
        label: labelForKey(key),
        value,
      });
    }
    slices.sort((a, b) => b.value - a.value);
    return slices;
  }

  private formatContentTypeLabel(key: string): string {
    if (key === 'unknown') return 'Unknown';
    const spaced = key.replaceAll(/[_-]+/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
  }

  private buildQuizOverview(enrollments: Enrollment[]): StudentDashboardReportsQuiz {
    const scores: number[] = [];
    for (const e of enrollments) {
      const subs = e.progress?.quizSubmissions ?? [];
      for (const s of subs) {
        if (typeof s.score === 'number' && !Number.isNaN(s.score)) {
          scores.push(s.score);
        }
      }
    }

    if (scores.length === 0) {
      return { averageQuizScore: null, quizAttemptsCount: 0 };
    }

    const sum = scores.reduce((a, b) => a + b, 0);
    return {
      averageQuizScore: Math.round((sum / scores.length) * 10) / 10,
      quizAttemptsCount: scores.length,
    };
  }

  private buildCourseProgress(enrollments: Enrollment[]) {
    const progress = enrollments
      .filter((e) => e.courseTitle && e.progressPercentage !== undefined)
      .map((e) => ({
        courseName: e.courseTitle,
        progressPercentage: e.progressPercentage ?? 0,
      }));

    return progress.toSorted((a, b) => b.progressPercentage - a.progressPercentage).slice(0, 5);
  }

  private buildQuizScoresOverTime(enrollments: Enrollment[]) {
    const scores: { date: string; score: number; quizName: string }[] = [];
    for (const e of enrollments) {
      const subs = e.progress?.quizSubmissions ?? [];
      for (const s of subs) {
        if (typeof s.score === 'number' && !Number.isNaN(s.score) && s.submittedAt) {
          scores.push({
            date: new Date(s.submittedAt).toISOString().split('T')[0],
            score: s.score,
            quizName: s.contentTitle || 'Quiz',
          });
        }
      }
    }

    const sortedScores = scores.toSorted((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sortedScores.slice(-10);
  }
}
