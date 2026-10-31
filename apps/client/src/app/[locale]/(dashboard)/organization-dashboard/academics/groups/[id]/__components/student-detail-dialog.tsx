'use client';

import { useTranslations } from 'next-intl';
import { MessageCircle, Phone } from 'lucide-react';
import { Actions, Subjects } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/atoms/dialog';
import { Link } from '@/i18n/navigation';
import { ROUTE_ORG_USER_EDIT } from '@/lib/data/constants/routes.constants';
import { useUserByOrganization } from '@/lib/hooks/user/use-user.hook';
import { canUser } from '@/lib/utils/permissions/can';
import useUserStore from '@/lib/store/userStore';
import type { IStudent } from '@/lib/types/user/user.interface';

function ContactActions({ phone }: { phone?: string }) {
  const t = useTranslations('Academics');
  if (!phone) return null;
  const digits = phone.replaceAll(/\D/g, '');
  return (
    <div className="flex gap-2">
      <a href={`tel:${phone}`}>
        <Button variant="outline" size="sm">
          <Phone className="me-2 size-4" />
          {t('students.details.parent.call')}
        </Button>
      </a>
      <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm">
          <MessageCircle className="me-2 size-4" />
          {t('students.details.parent.whatsapp')}
        </Button>
      </a>
    </div>
  );
}

export function StudentDetailDialog({
  studentId,
  onOpenChange,
}: {
  studentId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('Academics');
  const currentUser = useUserStore((s) => s.user);
  const canEditUsers = canUser(currentUser, Actions.UPDATE, Subjects.USER);
  const { data: student, isLoading } = useUserByOrganization(studentId ?? '');
  const parent = (student as IStudent | undefined)?.parentUser;

  return (
    <Dialog open={!!studentId} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('students.details.title')}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t('students.details.loading')}</p>
        ) : student ? (
          <div className="space-y-4 text-sm">
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground">{t('students.details.name')}</p>
                <p>{`${student.firstName} ${student.lastName}`}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('students.details.email')}</p>
                <p>{student.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('students.details.phone')}</p>
                <p>{student.phone || t('students.details.notProvided')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('students.details.status')}</p>
                <p>{student.status ?? t('students.details.notProvided')}</p>
              </div>
            </div>
            {parent ? (
              <div className="space-y-3 border-t pt-3">
                <div>
                  <p className="text-muted-foreground">{t('students.details.parent.title')}</p>
                  <p>{`${parent.firstName} ${parent.lastName}`}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('students.details.email')}</p>
                  <p>{parent.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('students.details.phone')}</p>
                  <p>{parent.phone || t('students.details.notProvided')}</p>
                </div>
                <ContactActions phone={parent.phone} />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t('students.details.notFound')}</p>
        )}
        {canEditUsers && student ? (
          <Link href={ROUTE_ORG_USER_EDIT(student._id)}>
            <Button variant="outline">{t('students.details.edit')}</Button>
          </Link>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
