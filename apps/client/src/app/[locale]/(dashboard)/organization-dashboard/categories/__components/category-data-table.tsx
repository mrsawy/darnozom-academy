'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DataTable } from '@/components/molecules/data-table/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Input } from '@/components/atoms/input';
import { PlusIcon, ChevronDown, ChevronRight, Folder, FolderOpen, File } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { IconSearch } from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/atoms/dropdown-menu';
import {
  useCategoriesByOrganization,
  useDeleteCategory,
} from '@/lib/hooks/category/use-category.hook';
import { ROUTE_ORG_CATEGORIES } from '@/lib/data/constants/routes.constants';
import { ICategory } from '@/lib/types/category/ICategory';
import { ApprovalStatusBadge } from '@/app/[locale]/(dashboard)/main-admin-dashboard/__components/ApprovalStatusBadge';
import CreateCategoryForm from './create-category-form';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/lib/hooks/use-debounce';

import { cn } from '@/lib/utils';

const CATEGORY_SEARCH_QUERY_KEY = 'q';

function collectIdsWithChildren(nodes: ICategory[]): Set<string> {
  const ids = new Set<string>();
  function walk(node: ICategory) {
    if (node.childCategories.length > 0) {
      ids.add(node._id);
      node.childCategories.forEach(walk);
    }
  }
  nodes.forEach(walk);
  return ids;
}

interface CategoriesDataTableProps {
  organizationId: string;
}

/** Shared actions for category tree (expand/collapse, create subcategory, delete). */
interface CategoryTreeActions {
  toggleExpand: (id: string) => void;
  expandedNodes: Set<string>;
  categories: ICategory[];
  expandAllChildren: (nodeId: string, categories: ICategory[]) => void;
  collapseAllChildren: (nodeId: string, categories: ICategory[]) => void;
  setDefaultParentId: (id: string | null) => void;
  setCreateCategoryDialogIsOpen: (open: boolean) => void;
  handleDeleteCategory: (categoryId: string) => void;
}

interface CategoryNodeActionsProps {
  node: ICategory;
  actions: CategoryTreeActions;
}

function CategoryNodeActions({ node, actions }: CategoryNodeActionsProps) {
  const t = useTranslations('CategoryDataTable');
  const hasChildren = node.childCategories.length > 0;
  const canModify =
    !node.approvalStatus || node.approvalStatus === 'PENDING' || node.approvalStatus === 'REJECTED';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
          size="icon">
          <span className="sr-only">{t('openMenu')}</span>⋮
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {canModify ? (
          <DropdownMenuItem asChild>
            <Link href={`${ROUTE_ORG_CATEGORIES}/${node._id}`}>{t('editCategory')}</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => {
            actions.setDefaultParentId(node._id);
            actions.setCreateCategoryDialogIsOpen(true);
          }}>
          {t('addSubcategory')}
        </DropdownMenuItem>
        {hasChildren ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => actions.expandAllChildren(node._id, actions.categories)}>
              {t('expandAllChildren')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => actions.collapseAllChildren(node._id, actions.categories)}>
              {t('collapseAllChildren')}
            </DropdownMenuItem>
          </>
        ) : null}
        {canModify ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => actions.handleDeleteCategory(node._id)}>
              {t('deleteCategory')}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface CategoryNodeProps {
  node: ICategory;
  actions: CategoryTreeActions;
  /** When true, actions are rendered by the table column; no inline dropdown. */
  isRootRow?: boolean;
}

function CategoryNode({ node, actions, isRootRow = false }: CategoryNodeProps) {
  const t = useTranslations('CategoryDataTable');
  const hasChildren = node.childCategories.length > 0;
  const isExpanded = actions.expandedNodes.has(node._id);

  const expandCollapseButton = hasChildren ? (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 rounded p-0"
        onClick={() => actions.toggleExpand(node._id)}>
        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 rounded p-0"
        onClick={() =>
          isExpanded
            ? actions.collapseAllChildren(node._id, actions.categories)
            : actions.expandAllChildren(node._id, actions.categories)
        }
        title={isExpanded ? t('collapseAllChildrenTooltip') : t('expandAllChildrenTooltip')}>
        {isExpanded ? <FolderOpen className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
      </Button>
    </div>
  ) : (
    <div className="flex w-[52px] items-center justify-center">
      <File className="h-3 w-3 text-gray-400" />
    </div>
  );

  const rowContent = (
    <>
      {expandCollapseButton}
      <Link
        href={`${ROUTE_ORG_CATEGORIES}/${node._id}`}
        className={cn('ml-2 inline-block w-[250px] truncate font-medium hover:underline')}
        title={node.name}>
        {node.name}
      </Link>
      {!isRootRow && node.approvalStatus ? (
        <ApprovalStatusBadge status={node.approvalStatus} />
      ) : null}
      {!isRootRow && <CategoryNodeActions node={node} actions={actions} />}
    </>
  );

  return (
    <div className="ps-4">
      <div className="relative z-10 flex items-center gap-1">{rowContent}</div>
      {isExpanded && hasChildren ? (
        <div className="pl-4">
          {node.childCategories.map((child) => (
            <CategoryNode key={child._id} node={child} actions={actions} isRootRow={false} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CategoriesDataTable({ organizationId }: CategoriesDataTableProps) {
  const t = useTranslations('CategoryDataTable');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const qFromUrl = searchParams.get(CATEGORY_SEARCH_QUERY_KEY) ?? '';
  const [searchDraft, setSearchDraft] = useState(qFromUrl);

  useEffect(() => {
    setSearchDraft(qFromUrl);
  }, [qFromUrl]);

  const debouncedSearch = useDebounce(searchDraft, 400);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const next = debouncedSearch.trim();
    const current = (params.get(CATEGORY_SEARCH_QUERY_KEY) ?? '').trim();
    if (current === next) return;
    if (next) {
      params.set(CATEGORY_SEARCH_QUERY_KEY, next);
    } else {
      params.delete(CATEGORY_SEARCH_QUERY_KEY);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debouncedSearch, pathname, router, searchParams]);

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [createCategoryDialogIsOpen, setCreateCategoryDialogIsOpen] = useState(false);

  const searchForApi = debouncedSearch.trim() || undefined;

  const {
    data: categoriesData,
    isLoading,
    error,
  } = useCategoriesByOrganization({
    organizationId,
    page: 1,
    limit: 100,
    search: searchForApi,
  });

  const { data: categoriesForForm } = useCategoriesByOrganization({
    organizationId,
    page: 1,
    limit: 100,
  });

  const categories = useMemo(() => categoriesData?.docs ?? [], [categoriesData]);

  useEffect(() => {
    if (!debouncedSearch.trim()) return;
    setExpandedNodes(collectIdsWithChildren(categories));
  }, [debouncedSearch, categories]);

  const deleteCategoryMutation = useDeleteCategory();

  // Toggle expansion of a specific node
  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // Collapse all children recursively
  const collapseAllChildren = useCallback((nodeId: string, categories: ICategory[]) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(nodeId);
      for (const id of categories
        .find((c) => c._id == nodeId)
        ?.childCategories.map((cat) => cat._id) ?? [])
        newSet.delete(id);
      return newSet;
    });
  }, []);

  const handleDeleteCategory = useCallback(
    (categoryId: string) => {
      deleteCategoryMutation.mutate({ organizationId, categoryId });
    },
    [deleteCategoryMutation, organizationId]
  );

  // Also, make sure your expand/collapse functions work with the correct data:
  const expandAllChildren = useCallback((nodeId: string, categories: ICategory[]) => {
    setExpandedNodes(
      (prev) =>
        new Set([
          ...prev,
          nodeId,
          ...(categories.find((c) => c._id == nodeId)?.childCategories.map((cat) => cat._id) ?? []),
        ])
    );
  }, []);

  const categoryTreeActions: CategoryTreeActions = useMemo(
    () => ({
      toggleExpand,
      expandedNodes,
      categories,
      expandAllChildren,
      collapseAllChildren,
      setDefaultParentId,
      setCreateCategoryDialogIsOpen,
      handleDeleteCategory,
    }),
    [
      toggleExpand,
      expandedNodes,
      categories,
      expandAllChildren,
      collapseAllChildren,
      setDefaultParentId,
      setCreateCategoryDialogIsOpen,
      handleDeleteCategory,
    ]
  );

  const columns: ColumnDef<ICategory>[] = useMemo(
    () => [
      // {
      //   id: 'select',
      //   header: ({ table }) => (
      //     <div className="flex items-center justify-center rtl:ms-5">
      //       <Checkbox
      //         checked={
      //           table.getIsAllPageRowsSelected() ||
      //           (table.getIsSomePageRowsSelected() && 'indeterminate')
      //         }
      //         onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      //         aria-label={t('selectAll')}
      //       />
      //     </div>
      //   ),
      //   cell: ({ row }) => (
      //     <div className="mb-auto flex items-center justify-center rtl:ms-5">
      //       <Checkbox
      //         checked={row.getIsSelected()}
      //         onCheckedChange={(value) => row.toggleSelected(!!value)}
      //         aria-label={t('selectRow')}
      //       />
      //     </div>
      //   ),
      //   enableSorting: false,
      //   enableHiding: false,
      // },
      {
        accessorKey: 'name',
        header: t('categoryName'),
        cell: ({ row }) => (
          <CategoryNode node={row.original} actions={categoryTreeActions} isRootRow />
        ),
      },
      {
        accessorKey: 'description',
        header: t('description'),
        cell: ({ row }) => {
          const node: ICategory = row.original;
          const description = node.description ?? t('noDescription');
          return (
            <span className="text-muted-foreground block w-[250px] truncate" title={description}>
              {description}
            </span>
          );
        },
      },
      {
        accessorKey: 'approvalStatus',
        header: t('status'),
        cell: ({ row }) => {
          const status = row.original.approvalStatus;
          if (!status) return null;
          return <ApprovalStatusBadge status={status} />;
        },
      },
      {
        accessorKey: 'coursesCount',
        header: t('coursesCount'),
        cell: ({ row }) => <span>{row.original.coursesCount ?? 0}</span>,
      },
      {
        accessorKey: 'instructorsCount',
        header: t('instructorsCount'),
        cell: ({ row }) => <span>{row.original.instructorsCount ?? 0}</span>,
      },
      {
        id: 'actions',
        header: t('actions'),
        cell: ({ row }) => (
          <CategoryNodeActions node={row.original} actions={categoryTreeActions} />
        ),
      },
    ],
    [t, categoryTreeActions]
  );

  if (error) {
    return <div className="p-8 text-red-500">{t('error', { message: error.message })}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-5">
        <div>
          <h2 className="text-xl font-medium">{t('title')}</h2>
          <p className="mt-1 text-sm text-gray-600">{t('subtitle')}</p>
        </div>
        <Dialog open={createCategoryDialogIsOpen} onOpenChange={setCreateCategoryDialogIsOpen}>
          <DialogTrigger asChild>
            <Button variant="default">
              <PlusIcon /> {t('addCategory')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createCategory')}</DialogTitle>
            </DialogHeader>
            <CreateCategoryForm
              setOpen={setCreateCategoryDialogIsOpen}
              organizationId={organizationId}
              categories={categoriesForForm?.docs ?? []}
              parentId={defaultParentId}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="px-5 pb-2">
        <div className="relative max-w-sm">
          <IconSearch className="text-muted-foreground pointer-events-none absolute start-2 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder={t('searchPlaceholder')}
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="ps-9"
            aria-label={t('searchPlaceholder')}
          />
        </div>
      </div>

      <DataTable<ICategory>
        data={categories}
        columns={columns}
        getRowId={(row) => row._id}
        isLoading={isLoading}
        onChangeData={() => {
          // Controlled by tree state - no-op function
        }}
        pageSize={100}
      />
    </div>
  );
}

export default CategoriesDataTable;
