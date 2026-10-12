'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AttendanceStatus } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import type { AttendanceEntry, ISessionAttendance } from '@/lib/types/academics/academics';

const STATUSES = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.ABSENT,
] as const;

interface Row {
  status: AttendanceStatus | null;
  note: string;
}

function buildInitial(roster: string[], attendance: ISessionAttendance[]): Map<string, Row> {
  const map = new Map<string, Row>();
  for (const id of roster) {
    const existing = attendance.find((a) => a.studentId === id);
    map.set(id, { status: existing?.status ?? null, note: '' });
  }
  return map;
}

export function AttendanceTable({
  roster,
  people,
  attendance,
  disabled,
  pending,
  onSave,
}: {
  roster: string[];
  people: Record<string, string>;
  attendance: ISessionAttendance[];
  disabled: boolean;
  pending: boolean;
  onSave: (entries: AttendanceEntry[]) => void;
}) {
  const t = useTranslations('Academics');
  const [rows, setRows] = useState<Map<string, Row>>(() => buildInitial(roster, attendance));

  const setStatus = (id: string, status: AttendanceStatus) =>
    setRows((prev) => {
      const next = new Map(prev);
      const row = next.get(id)!;
      next.set(id, { ...row, status: row.status === status ? null : status });
      return next;
    });

  const setNote = (id: string, note: string) =>
    setRows((prev) => {
      const next = new Map(prev);
      next.set(id, { ...next.get(id)!, note });
      return next;
    });

  const anyMarked = [...rows.values()].some((r) => r.status !== null);

  const handleSave = () => {
    const entries: AttendanceEntry[] = [];
    for (const id of roster) {
      const row = rows.get(id)!;
      if (!row.status) continue;
      const entry: AttendanceEntry = { studentId: id, status: row.status };
      const trimmed = row.note.trim();
      if (trimmed) entry.note = trimmed;
      entries.push(entry);
    }
    onSave(entries);
  };

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {roster.map((id) => {
          const name = people[id] ?? id;
          const row = rows.get(id)!;
          return (
            <li key={id}>
              <fieldset className="space-y-2 rounded-md border p-3">
                <legend className="px-1 font-medium">{name}</legend>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={disabled}
                      aria-pressed={row.status === s}
                      onClick={() => setStatus(id, s)}
                      className="aria-pressed:bg-primary aria-pressed:text-primary-foreground rounded border px-3 py-1 text-sm">
                      {t(`sessions.attendance.statuses.${s}`)}
                    </button>
                  ))}
                </div>
                <Input
                  aria-label={t('sessions.attendance.note')}
                  value={row.note}
                  disabled={disabled}
                  onChange={(e) => setNote(id, e.target.value)}
                />
              </fieldset>
            </li>
          );
        })}
      </ul>
      <Button disabled={disabled || pending || !anyMarked} onClick={handleSave}>
        {t('sessions.attendance.save')}
      </Button>
    </div>
  );
}
