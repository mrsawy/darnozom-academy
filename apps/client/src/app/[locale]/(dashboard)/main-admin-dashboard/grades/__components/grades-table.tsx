'use client';

import { useTranslations } from 'next-intl';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import type { GradeResponse } from '@/lib/actions/grade/grade.action';

interface GradesTableProps {
  grades: GradeResponse[];
  onEdit: (grade: GradeResponse) => void;
  onDelete: (grade: GradeResponse) => void;
}

export function GradesTable({ grades, onEdit, onDelete }: GradesTableProps) {
  const t = useTranslations('AdminGrades');

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="px-4 py-3 text-start font-medium">{t('table.nameEn')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.nameAr')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {grades.map((grade) => (
            <tr key={grade._id} className="hover:bg-muted/30 border-b last:border-0">
              <td className="px-4 py-3 font-medium" dir="ltr">
                {grade.nameEn}
              </td>
              <td className="px-4 py-3 font-medium" dir="rtl">
                {grade.nameAr}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(grade)}
                    aria-label={t('table.editAria')}>
                    <IconPencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(grade)}
                    aria-label={t('table.deleteAria')}>
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
