'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { ChevronLeft, ChevronRight, Loader2, Save, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { AttendanceStatus, SessionRosterEntry } from '@/lib/types/attendance/attendance.types';
import { MarkStatusButtons } from '../mark-status-buttons';
import { SlotSessionPanelProps } from './slot-session-panel.schema';

const SEARCH_DEBOUNCE_MS = 350;

export function SlotSessionPanel({
  slot,
  roster,
  total,
  page,
  totalPages,
  limit,
  search,
  pendingCount,
  isLoading,
  isFetching,
  overrides,
  onOverrideChange,
  onSearchChange,
  onPageChange,
  onSave,
  isSaving,
  autoFocusSearch,
}: SlotSessionPanelProps) {
  const t = useTranslations('AttendanceMark');

  const [searchInput, setSearchInput] = useState(search);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocusSearch) {
      searchInputRef.current?.focus();
    }
  }, [autoFocusSearch]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (searchInput.trim() !== search) onSearchChange(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput, search, onSearchChange]);

  const getEffectiveStatus = (entry: SessionRosterEntry): AttendanceStatus | null => {
    const ov = overrides[entry.studentId];
    if (ov?.status !== undefined) return ov.status;
    return entry.status;
  };

  const handleMarkAll = useCallback(() => {
    for (const entry of roster) {
      onOverrideChange(entry.studentId, { status: AttendanceStatus.PRESENT });
    }
  }, [roster, onOverrideChange]);

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const busy = isSaving || isLoading;

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-md text-xs font-semibold">
            {slot.dayOfWeek?.slice(0, 3)}
          </div>
          <div>
            <div className="leading-tight font-semibold">
              {slot.startTime} – {slot.endTime}
            </div>
            <div className="text-muted-foreground text-xs">
              {total} {t('students')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 ? (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-500">
              {t('unsavedCount', { count: pendingCount })}
            </span>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAll}
            disabled={busy || roster.length === 0}>
            {t('markAllPresent')}
          </Button>
          <Button size="sm" onClick={onSave} disabled={busy || pendingCount === 0}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {t('saveChanges')}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b px-4 py-2.5">
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 rtl:right-2.5 rtl:left-auto" />
          <Input
            ref={searchInputRef}
            className="h-9 pl-8 rtl:pr-8 rtl:pl-3"
            placeholder={t('searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSearchChange(searchInput.trim());
              }
            }}
          />
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <RosterSkeleton rows={Math.min(limit, 6)} />
      ) : roster.length === 0 ? (
        <div className="text-muted-foreground py-10 text-center text-sm">
          {search ? t('noSearchResults') : t('noRosterForSlot')}
        </div>
      ) : (
        <div className={cn('transition-opacity', isFetching && 'pointer-events-none opacity-60')}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('student')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('contact')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('notes')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((entry) => {
                const effectiveStatus = getEffectiveStatus(entry);
                const isAutoAbsent = entry.status === null && entry.derivedAbsent;

                return (
                  <TableRow key={entry.studentId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {entry.avatar ? (
                          <Image
                            src={entry.avatar}
                            alt=""
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium">
                            {(entry.firstName?.[0] ?? '') + (entry.lastName?.[0] ?? '')}
                          </div>
                        )}
                        <span className="font-medium">
                          {entry.firstName} {entry.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                      <div>{entry.email}</div>
                      {entry.phone ? <div className="text-xs">{entry.phone}</div> : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MarkStatusButtons
                          value={effectiveStatus}
                          onChange={(status) => onOverrideChange(entry.studentId, { status })}
                          disabled={isSaving}
                        />
                        {isAutoAbsent ? (
                          <span className="text-muted-foreground text-[10px] whitespace-nowrap uppercase">
                            {t('absentAuto')}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs"
                        placeholder={t('notesPlaceholder')}
                        value={overrides[entry.studentId]?.notes ?? entry.notes ?? ''}
                        onChange={(e) =>
                          onOverrideChange(entry.studentId, { notes: e.target.value })
                        }
                        disabled={isSaving}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination footer */}
      {!isLoading && total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
          <span className="text-muted-foreground text-xs">
            {t('showingRange', { from, to, total })}
          </span>
          {totalPages > 1 ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                disabled={page <= 1 || isFetching}
                onClick={() => onPageChange(page - 1)}>
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <span className="px-2 text-sm tabular-nums">{t('pageOf', { page, totalPages })}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                disabled={page >= totalPages || isFetching}
                onClick={() => onPageChange(page + 1)}>
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RosterSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
          <div className="bg-muted h-4 w-40 animate-pulse rounded" />
          <div className="bg-muted ml-auto h-7 w-48 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}
