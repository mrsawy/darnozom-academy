'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { DataTable } from '@/components/molecules/data-table/data-table';
import { IPage } from '@/lib/types/page/page.interface';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/atoms/button';
import { IconDotsVertical, IconSearch, IconExternalLink, IconEdit } from '@tabler/icons-react';
import { Input } from '@/components/atoms/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/atoms/dropdown-menu';
import { Badge } from '@/components/atoms/badge';
import AddPageDialog from './add-page-dialog';
import {
  useDeletePage,
  usePagesByOrganization,
  useTogglePageStatus,
} from '@/lib/hooks/page/page.hook';
import useGeneralStore from '@/lib/store/generalStore';
import { Organization } from '@/lib/types/organization/organization.interface';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  getActiveSubscription,
  type ActiveSubscriptionResponse,
} from '@/lib/actions/subscription/subscription.action';
import { throwIfNatsError } from '@/lib/utils/natsErrorHandler';
import { Alert, AlertDescription, AlertTitle } from '@/components/atoms/alert';
import { ROUTE_ORG_BILLING, ROUTE_ORG_MY_PAGE_EDIT } from '@/lib/data/constants/routes.constants';

const formatDate = (date: Date | string | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function PageDataTable({ organization }: { organization: Organization }) {
  const t = useTranslations('PageDataTable');
  const router = useRouter();
  const { data: pages } = usePagesByOrganization();

  const { data: activeSubscription, isPending: isSubscriptionPending } =
    useQuery<ActiveSubscriptionResponse | null>({
      queryKey: ['activeSubscription'],
      queryFn: async (): Promise<ActiveSubscriptionResponse | null> =>
        throwIfNatsError(await getActiveSubscription()),
    });

  const pagesLimit = useMemo(() => {
    if (!activeSubscription) {
      return { kind: 'noSubscription' as const };
    }
    const raw = activeSubscription.plan?.features?.pagesPerSubscription;
    const limit = typeof raw === 'number' ? raw : undefined;
    const used = activeSubscription.usage?.pagesUsed ?? 0;
    if (limit === undefined) {
      return { kind: 'unknownLimit' as const };
    }
    if (limit < 0) {
      return { kind: 'unlimited' as const, used };
    }
    const remaining = Math.max(0, limit - used);
    const atLimit = used >= limit;
    return { kind: 'limited' as const, used, limit, remaining, atLimit };
  }, [activeSubscription]);

  const addPageBlocked = pagesLimit.kind === 'limited' && pagesLimit.atLimit;
  const toggleStatusMutation = useTogglePageStatus();
  const deletePageMutation = useDeletePage();

  const [pageList, setPageList] = useState<IPage[]>(pages?.docs ?? []);
  const [globalFilter, setGlobalFilter] = useState<string>('');

  React.useEffect(() => {
    setPageList(pages?.docs ?? []);
  }, [pages]);

  const _deleteSelected = useCallback((_ids: string[]) => {
    // Handle deletion logic here
  }, []);

  const togglePublishedStatus = useCallback(
    async (slug: string, currentStatus: boolean) => {
      try {
        useGeneralStore.setState({ generalIsLoading: true });
        await toggleStatusMutation.mutateAsync({
          slug,
          published: !currentStatus,
        });
      } catch (error: unknown) {
        // eslint-disable-next-line no-console
        console.log(error);
      } finally {
        useGeneralStore.setState({ generalIsLoading: false });
      }
    },
    [toggleStatusMutation]
  );

  const handleEditPage = useCallback(
    (slug: string) => {
      router.push(ROUTE_ORG_MY_PAGE_EDIT(slug));
    },
    [router]
  );

  const handleViewPage = useCallback(
    (slug: string) => {
      // Open page in new tab
      window.open(`/x/${organization.slug}/${slug}`, '_blank');
    },
    [organization.slug]
  );

  const columns: ColumnDef<IPage>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: t('columns.pageTitle'),
        cell: ({ row }) => {
          return (
            <div className="ms-3 w-[250px]">
              <h3 className="truncate font-medium" title={row.original.title}>
                {row.original.title}
              </h3>
              <p className="truncate text-sm opacity-70" title={`/${row.original.slug}`}>
                /{row.original.slug}
              </p>
            </div>
          );
        },
        enableHiding: false,
      },
      {
        accessorKey: 'slug',
        header: t('columns.slug'),
        cell: ({ row }) => {
          return (
            <code
              className="bg-muted block w-[250px] truncate rounded px-2 py-1 text-sm"
              title={row.original.slug}>
              {row.original.slug}
            </code>
          );
        },
      },
      {
        accessorKey: 'published',
        header: t('columns.status'),
        cell: ({ row }) => {
          return (
            <Badge variant={row.original.published ? 'default' : 'secondary'}>
              {row.original.published ? t('badges.published') : t('badges.draft')}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: t('columns.createdAt'),
        cell: ({ row }) => {
          return <span className="text-sm">{formatDate(row.original.createdAt)}</span>;
        },
      },
      {
        accessorKey: 'updatedAt',
        header: t('columns.lastUpdated'),
        cell: ({ row }) => {
          return <span className="text-sm">{formatDate(row.original.updatedAt)}</span>;
        },
      },
      {
        id: 'actions',
        accessorKey: 'actions',
        header: t('columns.actions'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleViewPage(row.original.slug)}
              title={t('buttons.viewPage')}>
              <IconExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEditPage(row.original.slug)}
              title={t('buttons.editPage')}>
              <IconEdit className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="data-[state=open]:bg-muted flex size-8"
                  size="icon">
                  <IconDotsVertical className="h-4 w-4" />
                  <span className="sr-only">{t('ariaLabels.openMenu')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleEditPage(row.original.slug)}>
                  <IconEdit className="mr-2 h-4 w-4" />
                  {t('buttons.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleViewPage(row.original.slug)}>
                  <IconExternalLink className="mr-2 h-4 w-4" />
                  {t('buttons.view')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() =>
                    void togglePublishedStatus(row.original.slug, row.original.published)
                  }>
                  {row.original.published ? t('buttons.unpublish') : t('buttons.publish')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  variant="destructive"
                  onClick={() => {
                    deletePageMutation.mutate(row.original._id);
                  }}>
                  {t('buttons.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [deletePageMutation, handleEditPage, handleViewPage, t, togglePublishedStatus]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-5">
        <div>
          <h2 className="text-xl font-medium">{t('title')}</h2>
          <p className="mt-1 text-sm opacity-70">{t('description')}</p>
        </div>
        <div className="flex gap-2">
          <AddPageDialog
            addDisabled={addPageBlocked}
            addDisabledTitle={addPageBlocked ? t('pagesLimit.atLimitHint') : undefined}
          />
        </div>
      </div>

      <div className="px-5">
        {isSubscriptionPending ? (
          <p className="text-muted-foreground text-sm">{t('pagesLimit.loading')}</p>
        ) : pagesLimit.kind === 'noSubscription' ? (
          <Alert>
            <AlertTitle>{t('pagesLimit.noSubscriptionTitle')}</AlertTitle>
            <AlertDescription>
              {t('pagesLimit.noSubscriptionBody')}{' '}
              <Link
                href={ROUTE_ORG_BILLING}
                className="text-primary font-medium underline underline-offset-4">
                {t('pagesLimit.viewPlans')}
              </Link>
            </AlertDescription>
          </Alert>
        ) : pagesLimit.kind === 'unknownLimit' ? (
          <Alert>
            <AlertTitle>{t('pagesLimit.unknownTitle')}</AlertTitle>
            <AlertDescription>{t('pagesLimit.unknownBody')}</AlertDescription>
          </Alert>
        ) : pagesLimit.kind === 'unlimited' ? (
          <Alert>
            <AlertTitle>{t('pagesLimit.unlimitedTitle')}</AlertTitle>
            <AlertDescription>
              {t('pagesLimit.unlimitedBody', { used: pagesLimit.used })}
            </AlertDescription>
          </Alert>
        ) : pagesLimit.kind === 'limited' ? (
          <Alert variant={pagesLimit.atLimit ? 'destructive' : 'default'}>
            <AlertTitle>
              {pagesLimit.atLimit
                ? t('pagesLimit.limitedAtCapTitle')
                : t('pagesLimit.limitedTitle')}
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                {t('pagesLimit.limitedBody', {
                  used: pagesLimit.used,
                  limit: pagesLimit.limit,
                  remaining: pagesLimit.remaining,
                })}
              </p>
              {pagesLimit.atLimit ? (
                <p>
                  <Link
                    href={ROUTE_ORG_BILLING}
                    className="font-medium underline underline-offset-4">
                    {t('pagesLimit.upgradeLink')}
                  </Link>
                </p>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="flex items-center space-x-2 p-5">
        <div className="relative ms-auto max-w-sm flex-1">
          <IconSearch className="absolute top-2.5 left-2 h-4 w-4 opacity-50" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <DataTable<IPage>
        data={pageList}
        columns={columns}
        getRowId={(row) => row.slug}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        onChangeData={setPageList}
      />
    </div>
  );
}

export default PageDataTable;
