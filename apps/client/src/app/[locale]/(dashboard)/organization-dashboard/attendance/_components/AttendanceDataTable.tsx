'use client';

import React, { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/molecules/data-table/data-table';
import { Input } from '@/components/atoms/input';
import { Button } from '@/components/atoms/button';
import { AttendanceStatus } from '@/lib/types/attendance/attendance.types';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export interface StudentAttendanceRow {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  status: AttendanceStatus | null;
  notes?: string;
  attendanceId?: string;
}

interface AttendanceDataTableProps {
  students: StudentAttendanceRow[];
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  onNotesChange: (studentId: string, notes: string) => void;
  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  loadMoreRef?: React.RefObject<HTMLDivElement | null>;
}

export function AttendanceDataTable({
  students,
  onStatusChange,
  onNotesChange,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  loadMoreRef,
}: AttendanceDataTableProps) {
  const t = useTranslations('AttendanceDataTable');
  const columns: ColumnDef<StudentAttendanceRow>[] = useMemo(
    () => [
      {
        accessorKey: 'firstName',
        header: t('student'),
        cell: ({ row }) => {
          return (
            <div className="flex w-[250px] items-center gap-3">
              {row.original.avatar ? (
                <Image
                  src={row.original.avatar}
                  alt={`${row.original.firstName} ${row.original.lastName}`}
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : null}
              <div className="min-w-0">
                <div
                  className="truncate font-medium"
                  title={`${row.original.firstName} ${row.original.lastName}`}>
                  {row.original.firstName} {row.original.lastName}
                </div>
              </div>
            </div>
          );
        },
        enableHiding: false,
      },
      {
        accessorKey: 'email',
        header: t('email'),
        cell: ({ row }) => {
          return (
            <span
              className="text-muted-foreground block w-[250px] truncate text-sm"
              title={row.original.email}>
              {row.original.email}
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => {
          const student = row.original;
          return (
            <div>
              <div className="flex gap-1">
                {(
                  [
                    [AttendanceStatus.PRESENT, t('present')],
                    [AttendanceStatus.ABSENT, t('absent')],
                    [AttendanceStatus.LATE, t('late')],
                    [AttendanceStatus.EXCUSED, t('excused')],
                  ] as [AttendanceStatus, string][]
                ).map(([status, label]) => (
                  <Button
                    key={status}
                    variant={
                      student.status === status
                        ? status === AttendanceStatus.PRESENT
                          ? 'default'
                          : status === AttendanceStatus.ABSENT
                            ? 'destructive'
                            : 'secondary'
                        : 'outline'
                    }
                    size="sm"
                    className={cn(
                      'h-7 px-2 text-xs',
                      student.status === status && 'ring-1 ring-offset-1'
                    )}
                    onClick={() => onStatusChange(student.studentId, status)}>
                    {label}
                  </Button>
                ))}
              </div>
              <div className="text-muted-foreground mt-1 text-xs">
                {student.status ?? t('notMarked')}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'notes',
        header: t('notes'),
        cell: ({ row }) => {
          const student = row.original;
          return (
            <Input
              className="h-8 text-xs"
              placeholder={t('addNote')}
              value={student.notes ?? ''}
              onChange={(e) => onNotesChange(student.studentId, e.target.value)}
            />
          );
        },
      },
    ],
    [onStatusChange, onNotesChange, t]
  );

  if (isLoading && students.length === 0) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-h-[600px] overflow-auto">
        <DataTable<StudentAttendanceRow>
          data={students}
          columns={columns}
          getRowId={(row) => row.studentId}
          onChangeData={() => {
            // Attendance data is controlled by parent - no-op function
          }}
        />
      </div>

      {/* Infinite scroll trigger */}
      {hasNextPage ? (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isFetchingNextPage ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
        </div>
      ) : null}

      {!hasNextPage && students.length > 0 && (
        <p className="text-muted-foreground py-4 text-center text-sm">
          {t('allStudentsLoaded', { count: students.length })}
        </p>
      )}

      {students.length === 0 && !isLoading && (
        <div className="text-muted-foreground py-8 text-center">{t('noStudentsFound')}</div>
      )}
    </div>
  );
}
