'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { hasAnyRole, Roles } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/atoms/dialog';
import { EvaluationForm } from '@/components/organs/academics/evaluation-form';
import { EvaluationList } from '@/components/organs/academics/evaluation-list';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import {
  useCreateEvaluation,
  useSessionEvaluations,
} from '@/lib/hooks/academics/use-academics.hook';
import type { ISession } from '@/lib/types/academics/academics';

const EVALUATOR_ROLES: readonly Roles[] = [
  Roles.SUPERVISOR,
  Roles.MANAGER,
  Roles.OWNER,
  Roles.ADMIN,
  Roles.SUPER_ADMIN,
];

export function EvaluateSessionDialog({ session }: { session: ISession }) {
  const t = useTranslations('Academics');
  const [open, setOpen] = useState(false);
  const { data: user } = useAuthUser();
  const { data: evaluations = [], isLoading: evaluationsLoading } = useSessionEvaluations(
    session._id
  );
  const createEvaluation = useCreateEvaluation();

  const isTeacher = user?._id === session.teacherId;
  const canEvaluateRole = hasAnyRole(user, EVALUATOR_ROLES);
  if (isTeacher || !canEvaluateRole) {
    return null;
  }

  const alreadyEvaluated = evaluations.some((e) => e.supervisorId === user?._id);

  if (alreadyEvaluated) {
    return (
      <span className="text-muted-foreground text-sm">{t('supervision.alreadyEvaluated')}</span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t('supervision.evaluate')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('supervision.evaluate')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-base font-semibold">{t('supervision.title')}</h3>
            <EvaluationForm
              isSubmitting={createEvaluation.isPending}
              onSubmit={async (data) => {
                await createEvaluation.mutateAsync({ sessionId: session._id, data });
                setOpen(false);
              }}
            />
            {evaluations.length > 0 ? (
              <div className="mt-6 space-y-2 border-t pt-4">
                <h4 className="text-sm font-semibold">{t('supervision.title')}</h4>
                <EvaluationList evaluations={evaluations} isLoading={evaluationsLoading} />
              </div>
            ) : null}
          </div>

          <div className="space-y-6 border-t pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
            <div className="space-y-2">
              <h3 className="text-base font-semibold">{t('sessions.report.title')}</h3>
              {session.report ? (
                <div className="space-y-2 rounded-md border p-3">
                  {session.report.summary ? (
                    <p className="text-sm">{session.report.summary}</p>
                  ) : null}
                  {session.report.evaluations?.length ? (
                    <ul className="space-y-2">
                      {session.report.evaluations.map((ev) => (
                        <li key={ev.studentId} className="rounded border p-2 text-xs">
                          <p className="text-muted-foreground font-mono">{ev.studentId}</p>
                          <p>
                            {`${t('sessions.report.participation')}: ${ev.participation} · ${t('sessions.report.understanding')}: ${ev.understanding} · ${t('sessions.report.behavior')}: ${ev.behavior} · ${t('sessions.report.homework')}: ${ev.homework}`}
                          </p>
                          {ev.note ? <p className="text-muted-foreground">{ev.note}</p> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{t('sessions.report.empty')}</p>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-semibold">{t('sessions.attendance.title')}</h3>
              {session.attendance?.length ? (
                <ul className="space-y-1">
                  {session.attendance.map((att) => (
                    <li
                      key={att.studentId}
                      className="flex items-center justify-between rounded border p-2 text-xs">
                      <span className="text-muted-foreground font-mono">{att.studentId}</span>
                      <span className="font-medium">
                        {t(`sessions.attendance.statuses.${att.status}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">{t('sessions.attendance.locked')}</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
