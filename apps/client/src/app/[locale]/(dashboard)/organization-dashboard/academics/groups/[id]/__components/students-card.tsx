'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { GroupPaymentStatus, GroupStudentStatus } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Switch } from '@/components/atoms/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { useDebounce } from '@/lib/hooks/use-debounce';
import type { IGroupDetail, IGroupStudent } from '@/lib/types/academics/academics';
import {
  useAddStudent,
  useRemoveStudent,
  useSetWhatsapp,
  useStudentCandidates,
} from '@/lib/hooks/academics/use-academics.hook';

const isWithdrawn = (student: IGroupStudent) => student.status === GroupStudentStatus.WITHDRAWN;

export function StudentsCard({ group, disabled }: { group: IGroupDetail; disabled: boolean }) {
  const t = useTranslations('Academics');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const { data: candidates = [] } = useStudentCandidates(disabled ? '' : group._id, debounced);
  const addStudent = useAddStudent();
  const removeStudent = useRemoveStudent();
  const setWhatsapp = useSetWhatsapp();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{`${t('students.title')} (${group.students.length}/${group.maxStudents})`}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('students.payment')}</TableHead>
              <TableHead>{t('students.whatsapp')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.students.map((student) => (
              <TableRow key={student.studentId}>
                <TableCell>
                  {group.people[student.studentId] ?? student.studentId}
                  {isWithdrawn(student) ? (
                    <span className="text-muted-foreground ms-2 text-sm">
                      {t('students.withdrawn')}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <span>
                    {student.paymentStatus === GroupPaymentStatus.PAID
                      ? t('students.paid')
                      : t('students.unpaid')}
                  </span>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={student.whatsappAdded}
                    disabled={disabled || isWithdrawn(student)}
                    onCheckedChange={(whatsappAdded) =>
                      setWhatsapp.mutate({
                        id: group._id,
                        studentId: student.studentId,
                        whatsappAdded,
                      })
                    }
                    aria-label={t('students.whatsapp')}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled || isWithdrawn(student)}
                    onClick={() =>
                      removeStudent.mutate({ id: group._id, studentId: student.studentId })
                    }>
                    {t('remove')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {disabled ? null : (
          <div className="space-y-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('students.search')}
            />
            {candidates.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('students.noCandidates')}</p>
            ) : null}
            <ul className="space-y-1">
              {candidates.map((candidate) => (
                <li key={candidate._id} className="flex items-center justify-between text-sm">
                  <span>{`${candidate.firstName ?? ''} ${candidate.lastName ?? ''} (${candidate.email ?? candidate.username ?? ''})`}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={addStudent.isPending}
                    onClick={() => addStudent.mutate({ id: group._id, studentId: candidate._id })}>
                    {t('add')}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
