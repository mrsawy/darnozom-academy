'use client';

import { useTranslations } from 'next-intl';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import type { SchoolTypeResponse } from '@/lib/actions/school-type/school-type.action';

interface SchoolTypesTableProps {
  schoolTypes: SchoolTypeResponse[];
  onEdit: (schoolType: SchoolTypeResponse) => void;
  onDelete: (schoolType: SchoolTypeResponse) => void;
}

export function SchoolTypesTable({ schoolTypes, onEdit, onDelete }: SchoolTypesTableProps) {
  const t = useTranslations('AdminSchoolTypes');

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
          {schoolTypes.map((schoolType) => (
            <tr key={schoolType._id} className="hover:bg-muted/30 border-b last:border-0">
              <td className="px-4 py-3 font-medium" dir="ltr">
                {schoolType.nameEn}
              </td>
              <td className="px-4 py-3 font-medium" dir="rtl">
                {schoolType.nameAr}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(schoolType)}
                    aria-label={t('table.editAria')}>
                    <IconPencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(schoolType)}
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
