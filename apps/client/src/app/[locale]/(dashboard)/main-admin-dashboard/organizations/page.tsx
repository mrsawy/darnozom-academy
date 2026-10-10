'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { IconSearch } from '@tabler/icons-react';
import { useAdminOrganizations } from '@/lib/hooks/admin-review/use-admin-review.hook';
import { ROUTE_MAIN_ADMIN_ORGANIZATIONS } from '@/lib/data/constants/routes.constants';

export default function OrganizationsPage() {
  const t = useTranslations('AdminDashboard');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { data, isLoading, isError, refetch } = useAdminOrganizations({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
  });
  const router = useRouter();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('organizationsTitle')}</h1>
        <p className="text-muted-foreground">{t('organizationsDescription')}</p>
      </div>

      <div className="relative max-w-sm">
        <IconSearch className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-8"
        />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">{t('emptyStates.loading')}</div>
      ) : isError ? (
        <div className="space-y-2 py-8 text-center">
          <p className="text-destructive">{t('emptyStates.failedToLoadItems')}</p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : !data || data.docs.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center">
          {t('emptyStates.noOrganizations')}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.name')}</TableHead>
                  <TableHead>{t('table.plan')}</TableHead>
                  <TableHead>{t('table.subscriptionStatus')}</TableHead>
                  <TableHead>{t('table.courses')}</TableHead>
                  <TableHead>{t('table.enrollments')}</TableHead>
                  <TableHead>{t('table.rating')}</TableHead>
                  <TableHead>{t('table.created')}</TableHead>
                  <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.docs.map((org) => (
                  <TableRow key={org._id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>{org.planName ?? '—'}</TableCell>
                    <TableCell>
                      {org.subscriptionStatus
                        ? t(`orgPlan.subscriptionStatus.${org.subscriptionStatus}` as never)
                        : '—'}
                    </TableCell>
                    <TableCell>{org.stats?.totalCourses ?? 0}</TableCell>
                    <TableCell>{org.stats?.totalEnrollments ?? 0}</TableCell>
                    <TableCell>{org.stats?.averageRating?.toFixed(1) ?? '—'}</TableCell>
                    <TableCell>{new Date(org.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`${ROUTE_MAIN_ADMIN_ORGANIZATIONS}/${org._id}`)}>
                        {t('buttons.viewDetails')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-4">
            <p className="text-muted-foreground text-sm">
              {t('paginationOrgs', {
                page: data.page,
                totalPages: data.totalPages,
                totalDocs: data.totalDocs,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!data.hasPrevPage}
                onClick={() => setPage(page - 1)}>
                {t('buttons.previous')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!data.hasNextPage}
                onClick={() => setPage(page + 1)}>
                {t('buttons.next')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
