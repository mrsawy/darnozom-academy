'use client';

import { LoadingState } from '@/components/atoms/loading-state';
import { useTranslations } from 'next-intl';
import { AttendanceStatus } from '@darnozom/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/atoms/table';
import { useGroupAttendanceMatrix } from '@/lib/hooks/academics/use-academics.hook';

const CELL_STYLE: Record<AttendanceStatus, string> = {
  [AttendanceStatus.PRESENT]: 'bg-green-100 text-green-800',
  [AttendanceStatus.LATE]: 'bg-yellow-100 text-yellow-800',
  [AttendanceStatus.EXCUSED]: 'bg-blue-100 text-blue-800',
  [AttendanceStatus.ABSENT]: 'bg-red-100 text-red-800',
};

const formatRate = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 100)}%`);

/** Students x sessions grid for one group, with each person's attendance rate over the sessions already held. */
export function GroupAttendanceCard({ groupId }: { groupId: string }) {
  const t = useTranslations('Academics');
  const { data, isLoading } = useGroupAttendanceMatrix(groupId);

  const cell = (status: AttendanceStatus | null | undefined) =>
    status ? (
      <span
        title={t(`sessions.attendance.statuses.${status}`)}
        className={`inline-flex min-w-7 justify-center rounded px-1.5 py-0.5 text-xs font-medium ${CELL_STYLE[status]}`}>
        {t(`sessions.attendance.short.${status}`)}
      </span>
    ) : (
      <span className="text-muted-foreground">—</span>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sessions.attendance.gridTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <LoadingState />
        ) : data.sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('sessions.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40">{t('sessions.attendance.student')}</TableHead>
                  {data.sessions.map((session) => (
                    <TableHead key={session.id} className="text-center">
                      {session.sequence}
                    </TableHead>
                  ))}
                  <TableHead className="text-end">{t('sessions.attendance.rate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/40">
                  <TableCell className="font-medium">{t('sessions.attendance.teacher')}</TableCell>
                  {data.sessions.map((session) => (
                    <TableCell key={session.id} className="text-center">
                      {cell(session.teacherAttendance)}
                    </TableCell>
                  ))}
                  <TableCell className="text-end">{formatRate(data.teacherAttendedRate)}</TableCell>
                </TableRow>
                {data.students.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    {data.sessions.map((session) => (
                      <TableCell key={session.id} className="text-center">
                        {cell(student.cells[session.id])}
                      </TableCell>
                    ))}
                    <TableCell className="text-end">{formatRate(student.attendedRate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
