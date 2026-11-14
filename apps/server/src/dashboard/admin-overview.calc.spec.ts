import { AttendanceStatus } from '@darnozom/shared-types';
import { avg, rate, tallySessions, topAndBottom, OverviewSession } from './admin-overview.calc';

const ev = (studentId: string, n: number) => ({
  studentId,
  participation: n,
  understanding: n,
  behavior: n,
  homework: n,
});

describe('admin-overview.calc', () => {
  const sessions: OverviewSession[] = [
    {
      groupId: 'g1',
      teacherId: 't1',
      attendance: [
        { studentId: 's1', status: AttendanceStatus.PRESENT },
        { studentId: 's2', status: AttendanceStatus.ABSENT },
        { studentId: 's3', status: AttendanceStatus.EXCUSED },
      ],
      evaluations: [ev('s1', 5), ev('s2', 2)],
    },
  ];

  it('computes attendance rate ignoring excused marks and mean scores', () => {
    const { byTeacher, byStudent } = tallySessions(sessions);
    expect(rate(byTeacher.get('t1')!)).toBe(50);
    expect(avg(byTeacher.get('t1')!)).toBe(3.5);
    expect(avg(byStudent.get('s1')!)).toBe(5);
    expect(rate(byStudent.get('s3')!)).toBeNull();
  });

  it('never lists the same item as both best and worst', () => {
    const items = [
      { id: 'a', avgScore: 4, attendanceRate: 90 },
      { id: 'b', avgScore: 2, attendanceRate: 50 },
      { id: 'c', avgScore: null, attendanceRate: null },
    ];
    const { top, bottom } = topAndBottom(items, 3);
    expect(top.map((i) => i.id)).toEqual(['a', 'b']);
    expect(bottom).toEqual([]);
  });

  it('puts the weakest first in the bottom list', () => {
    const items = [5, 4, 3, 2, 1].map((n) => ({ id: String(n), avgScore: n, attendanceRate: 80 }));
    const { top, bottom } = topAndBottom(items, 2);
    expect(top.map((i) => i.id)).toEqual(['5', '4']);
    expect(bottom.map((i) => i.id)).toEqual(['1', '2']);
  });
});
