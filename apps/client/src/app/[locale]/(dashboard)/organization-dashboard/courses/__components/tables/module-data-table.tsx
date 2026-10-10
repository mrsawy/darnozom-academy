'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DataTable, SortableRowHandleContext } from '@/components/molecules/data-table/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { IModule } from '@/lib/types/course/modules.interface';

import { Button } from '@/components/atoms/button';
import { IconDotsVertical, IconGripVertical, IconSearch } from '@tabler/icons-react';
import { Checkbox } from '@/components/atoms/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/atoms/dialog';
import { Input } from '@/components/atoms/input';
import { Plus, PlusIcon, X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/atoms/dropdown-menu';
import { useTranslations } from 'next-intl';

import {
  useDeleteModule,
  useModules,
  useReorderModules,
  useUpdateModule,
} from '@/lib/hooks/course/useModules';
import CreateModuleForm from '../modules/create-module-form';
import { ApprovalStatusBadge } from '@/app/[locale]/(dashboard)/main-admin-dashboard/__components/ApprovalStatusBadge';
import { PublishToggle } from '@/components/molecules/publish-toggle';
import { useSetModulePublishStatus } from '@/lib/hooks/course/usePublishStatus';
import { DiscussionDialog } from '@/components';
import { DiscussionType } from '@/lib/types/discussion/discussion.types';

// Create a separate component for the drag handle
const DragHandle = React.memo(() => {
  const t = useTranslations('ModuleDataTable');
  const ctx = React.useContext(SortableRowHandleContext);
  return (
    <div
      {...(ctx?.attributes ?? {})}
      {...(ctx?.listeners ?? {})}
      className="text-muted-foreground flex size-7 cursor-grab items-center justify-center active:cursor-grabbing">
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">{t('ariaLabels.dragToReorder')}</span>
    </div>
  );
});

DragHandle.displayName = 'DragHandle';

function ModulesDataTable({ courseId }: { courseId: string }) {
  const t = useTranslations('ModuleDataTable');
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [tempObjectives, setTempObjectives] = useState<string[]>([]);
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [createModuleDialogIsOpen, setCreateModuleDialogIsOpen] = useState<boolean>(false);

  // Use custom hooks for modules management
  const { data: modulesData, isLoading, error: modulesQueryError } = useModules(courseId || '');

  const [modules, setModules] = useState<IModule[]>([]);
  const emptyRef = useRef<IModule[]>([]);
  const normalizedModulesData = useMemo(() => modulesData ?? emptyRef.current, [modulesData]);

  useEffect(() => {
    setModules(normalizedModulesData);
  }, [normalizedModulesData]);

  const deleteModuleMutation = useDeleteModule(courseId);
  const updateModuleMutation = useUpdateModule();
  const reorderModulesMutation = useReorderModules(courseId ?? '');
  const {
    mutate: setModulePublish,
    isPending: isPublishPending,
    variables: publishVariables,
  } = useSetModulePublishStatus();

  const handleReorder = useCallback(
    (newModules: IModule[]) => {
      setModules(newModules);
      const newOrder = newModules.map((m) => m._id);
      reorderModulesMutation.mutate(newOrder);
    },
    [reorderModulesMutation]
  );

  const handleDeleteModule = useCallback(
    (moduleId: string) => {
      deleteModuleMutation.mutate(moduleId);
    },
    [deleteModuleMutation]
  );

  // Handle opening the dialog and initializing temp objectives
  const handleOpenDialog = useCallback(
    (moduleId: string) => {
      const moduleData = modules.find((m) => m._id === moduleId);
      if (moduleData) {
        setTempObjectives([...moduleData.learningObjectives]);
        setOpenRowId(moduleId);
      }
    },
    [modules]
  );

  // Handle closing dialog and resetting temp state
  const handleCloseDialog = useCallback(() => {
    setOpenRowId(null);
    setTempObjectives([]);
  }, []);

  // Handle saving changes
  const handleSaveObjectives = useCallback(
    (moduleId: string) => {
      updateModuleMutation.mutate({
        moduleId,
        updateData: { learningObjectives: tempObjectives },
      });
      handleCloseDialog();
    },
    [tempObjectives, handleCloseDialog, updateModuleMutation]
  );

  // Temp objective management functions
  const removeObjective = useCallback((index: number) => {
    setTempObjectives((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateObjective = useCallback((index: number, value: string) => {
    setTempObjectives((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  const addObjective = useCallback(() => {
    setTempObjectives((prev) => [...prev, '']);
  }, []);

  // Memoize columns to prevent re-renders
  const columns: ColumnDef<IModule>[] = useMemo(
    () => [
      {
        id: 'drag',
        header: () => null,
        cell: () => <DragHandle />,
      },
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label={t('ariaLabels.selectAll')}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={t('ariaLabels.selectRow')}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'title',
        header: t('columns.title'),
        cell: ({ row }) => {
          return (
            <h3 className="w-[250px] truncate" title={row.original.title}>
              {row.original.title}
            </h3>
          );
        },
        enableHiding: false,
      },
      {
        accessorKey: 'description',
        header: t('columns.description'),
        cell: ({ row }) => (
          <h4
            className="text-muted-foreground w-[250px] truncate"
            title={row.original.description ?? undefined}>
            {row.original.description}
          </h4>
        ),
      },
      {
        accessorKey: 'learningObjectives',
        header: t('columns.learningObjectives'),
        cell: ({ row }) => {
          return (
            <Button variant="outline" onClick={() => handleOpenDialog(row.original._id)}>
              {t('buttons.view')}
            </Button>
          );
        },
      },
      {
        accessorKey: 'contents',
        header: t('columns.content'),
        cell: ({ row }) => {
          const count = row.original.contentsIds.length;
          return (
            <Link
              href={`/organization-dashboard/courses/${courseId}/modules/${row.original._id}/content`}
              className="text-blue-800 underline underline-offset-2 dark:text-blue-400">
              {t('content.contents', { count })}
            </Link>
          );
        },
      },
      {
        id: 'discussions',
        header: t('columns.discussions'),
        cell: ({ row }) => (
          <DiscussionDialog
            type={DiscussionType.MODULE}
            courseId={courseId}
            moduleId={row.original._id}
            entityTitle={row.original.title}
            canDeleteAny
          />
        ),
      },
      {
        accessorKey: 'publishStatus',
        header: t('columns.status'),
        cell: ({ row }) => {
          const mod = row.original;
          return (
            <PublishToggle
              publishStatus={mod.publishStatus}
              approvalStatus={mod.approvalStatus}
              isPending={isPublishPending ? publishVariables?.moduleId === mod._id : null}
              onToggle={(status) => setModulePublish({ moduleId: mod._id, publishStatus: status })}
            />
          );
        },
      },
      {
        accessorKey: 'approvalStatus',
        header: t('columns.approval'),
        cell: ({ row }) => {
          const status = row.original.approvalStatus;
          if (!status) return null;
          return <ApprovalStatusBadge status={status} />;
        },
      },
      {
        id: 'actions',
        accessorKey: 'actions',
        header: t('columns.actions'),
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                size="icon">
                <IconDotsVertical />
                <span className="sr-only">{t('ariaLabels.openMenu')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem>
                <Link
                  href={`/organization-dashboard/courses/${courseId}/modules/${row.original._id}`}>
                  {t('buttons.edit')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => handleDeleteModule(row.original._id)}>
                {t('buttons.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [
      handleOpenDialog,
      handleDeleteModule,
      courseId,
      t,
      isPublishPending,
      publishVariables,
      setModulePublish,
    ]
  );

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-5">
          <h2 className="text-xl font-medium">{t('title')}</h2>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">{t('loading')}</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (modulesQueryError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-5">
          <h2 className="text-xl font-medium">{t('title')}</h2>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-red-500">
            {t('error', {
              message:
                modulesQueryError instanceof Error ? modulesQueryError.message : 'Unknown error',
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex items-center justify-between p-5">
        <h2 className="text-xl font-medium">{t('title')}</h2>
        <Dialog open={createModuleDialogIsOpen} onOpenChange={setCreateModuleDialogIsOpen}>
          <DialogTrigger asChild>
            <Button variant="default">
              <PlusIcon />
              {t('addModule')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createModule')}</DialogTitle>
            </DialogHeader>
            <CreateModuleForm
              setOpen={setCreateModuleDialogIsOpen}
              courseId={courseId?.toString()}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center space-x-2 p-5">
        <div className="relative ms-auto max-w-sm flex-1">
          <IconSearch className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <DataTable<IModule>
        data={modules}
        columns={columns}
        onReorder={handleReorder}
        getRowId={(row) => row._id}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        onChangeData={setModules}
        pageSize={100}
      />

      {/* Move Dialog outside of columns */}
      <Dialog
        open={!!openRowId}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDialog();
          }
        }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('dialogs.learningObjectives.title')}</DialogTitle>
            <DialogDescription>{t('dialogs.learningObjectives.description')}</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between">
            <span className="text-sm">{t('dialogs.learningObjectives.label')}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addObjective}
              className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              {t('buttons.addObjective')}
            </Button>
          </div>

          <div className="space-y-2">
            {tempObjectives.map((objective, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={objective}
                  onChange={(e) => updateObjective(index, e.target.value)}
                  placeholder={t('dialogs.learningObjectives.placeholder', { index: index + 1 })}
                  className="flex-1"
                />
                {tempObjectives.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeObjective(index)}
                    className="text-red-500 hover:text-red-700">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={handleCloseDialog}>
                {t('buttons.cancel')}
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => openRowId && handleSaveObjectives(openRowId)}>
              {t('buttons.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ModulesDataTable;
