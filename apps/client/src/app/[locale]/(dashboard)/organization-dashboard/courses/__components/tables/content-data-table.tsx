'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DataTable, SortableRowHandleContext } from '@/components/molecules/data-table/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { IContent } from '@/lib/types/course/content.interface';

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
} from '@/components/atoms/dialog';
import { Input } from '@/components/atoms/input';
import { PlusIcon, Download, FileText, Video, Image, Music, File, Calendar } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/atoms/dropdown-menu';
import { useTranslations } from 'next-intl';

import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';
import {
  ROUTE_ORG_COURSE_MODULE_CONTENT_EDIT,
  ROUTE_ORG_COURSE_MODULE_CONTENT_ADD_NEW,
} from '@/lib/data/constants/routes.constants';
import {
  useContentByModule,
  useDeleteContent,
  useDeleteContents,
  useReorderContents,
  useUpdateContent,
} from '@/lib/hooks/course/content/useContent';
import { ApprovalStatusBadge } from '@/app/[locale]/(dashboard)/main-admin-dashboard/__components/ApprovalStatusBadge';
import { PublishToggle } from '@/components/molecules/publish-toggle';
import { useSetContentPublishStatus } from '@/lib/hooks/course/usePublishStatus';

// Content type icon mapping
const getContentTypeIcon = (contentType: string) => {
  if (contentType === 'LIVE_SESSION') return <Calendar className="h-4 w-4 text-violet-500" />;
  if (contentType === 'ATTACHMENT') return <FileText className="h-4 w-4 text-gray-600" />;
  const type = contentType?.toLowerCase();
  if (type?.includes('video')) return <Video className="h-4 w-4 text-blue-500" />;
  if (type?.includes('image')) return <Image className="h-4 w-4 text-green-500" />;
  if (type?.includes('audio')) return <Music className="h-4 w-4 text-purple-500" />;
  if (type?.includes('text') ?? type?.includes('document'))
    return <FileText className="h-4 w-4 text-gray-500" />;
  return <File className="h-4 w-4 text-gray-400" />;
};

// Create a separate component for the drag handle
const DragHandle = React.memo(() => {
  const t = useTranslations('ContentDataTable');
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

interface ContentDataTableProps {
  courseId: string;
  moduleId: string;
}

function ContentDataTable({ courseId, moduleId }: ContentDataTableProps) {
  const t = useTranslations('ContentDataTable');
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [tempDescription, setTempDescription] = useState<string>('');
  const [globalFilter, setGlobalFilter] = useState<string>('');

  // Use custom hooks for content management
  const { data: moduleWithContent, isLoading, error } = useContentByModule(moduleId ?? '');

  const [contents, setContents] = useState<IContent[]>([]);
  const emptyRef = useRef<IContent[]>([]);
  const normalizedContentData = useMemo(
    () => moduleWithContent?.contents ?? emptyRef.current,
    [moduleWithContent]
  );

  useEffect(() => {
    setContents(normalizedContentData);
  }, [normalizedContentData]);

  const deleteContentsMutation = useDeleteContents();
  const deleteContentMutation = useDeleteContent();
  const reorderContentsMutation = useReorderContents(moduleId ?? '');
  const {
    mutate: setContentPublish,
    isPending: isPublishPending,
    variables: publishVariables,
  } = useSetContentPublishStatus();

  const _deleteSelected = useCallback(
    (ids: string[]) => {
      deleteContentsMutation.mutate(ids);
    },
    [deleteContentsMutation]
  );

  const handleReorder = useCallback(
    (newContents: IContent[]) => {
      setContents(newContents);
      const newOrder = newContents.map((c) => c._id);
      reorderContentsMutation.mutate(newOrder);
    },
    [reorderContentsMutation]
  );

  const handleDeleteContent = useCallback(
    (contentId: string) => {
      deleteContentMutation.mutate(contentId);
    },
    [deleteContentMutation]
  );

  // Handle opening the dialog and initializing temp description
  const handleOpenDialog = useCallback(
    (contentId: string) => {
      const content = contents.find((c) => c._id === contentId);
      if (content) {
        setTempDescription(content.description ?? '');
        setOpenRowId(contentId);
      }
    },
    [contents]
  );

  // Handle closing dialog and resetting temp state
  const handleCloseDialog = useCallback(() => {
    setOpenRowId(null);
    setTempDescription('');
  }, []);

  // Handle saving changes
  const updateContentMutation = useUpdateContent();
  const handleSaveDescription = useCallback(
    (contentId: string) => {
      updateContentMutation.mutate(
        { contentId, updatedData: { description: tempDescription } },
        { onSuccess: () => handleCloseDialog() }
      );
    },
    [updateContentMutation, tempDescription, handleCloseDialog]
  );

  // Format file size
  const _formatFileSize = useCallback((bytes: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }, []);

  // Format duration (if available)
  const _formatDuration = useCallback((seconds: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Memoize columns to prevent re-renders
  const columns: ColumnDef<IContent>[] = useMemo(
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
                table.getIsAllPageRowsSelected() ??
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
            <div className="flex w-[250px] items-center gap-2">
              {getContentTypeIcon(row.original.type)}
              <h3 className="min-w-0 truncate font-medium" title={row.original.title}>
                {row.original.title}
              </h3>
            </div>
          );
        },
        enableHiding: false,
      },
      {
        accessorKey: 'contentType',
        header: t('columns.type'),
        cell: ({ row }) => {
          const contentType = row.original.type;
          const translatedType = t(`contentTypes.${contentType}`) || contentType;
          return (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              {translatedType}
            </span>
          );
        },
      },
      {
        accessorKey: 'description',
        header: t('columns.description'),
        cell: ({ row }) => (
          <div className="w-[250px]">
            <p
              className="text-muted-foreground truncate text-sm"
              title={row.original.description ?? undefined}>
              {row.original.description ?? t('noDescription')}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDialog(row.original._id)}
              className="mt-1 h-auto p-0 text-xs text-blue-600 hover:text-blue-800">
              {t('buttons.editDescription')}
            </Button>
          </div>
        ),
      },
      // {
      //     accessorKey: "fileSize",
      //     header: "File Size",
      //     cell: ({ row }) => {
      //         const fileSize = row.original.fileSize;
      //         return (
      //             <span className="text-sm">
      //                 {formatFileSize(fileSize)}
      //             </span>
      //         );
      //     }
      // },
      // {
      //     accessorKey: "duration",
      //     header: "Duration",
      //     cell: ({ row }) => {
      //         const duration = row.original.duration;
      //         return (
      //             <span className="text-sm">
      //                 {formatDuration(duration)}
      //             </span>
      //         );
      //     }
      // },
      {
        accessorKey: 'createdAt',
        header: t('columns.created'),
        cell: ({ row }) => {
          const date = new Date(row.original.createdAt);
          return <span className="text-muted-foreground text-sm">{date.toLocaleDateString()}</span>;
        },
      },
      {
        accessorKey: 'publishStatus',
        header: t('columns.status'),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <PublishToggle
              publishStatus={item.publishStatus}
              approvalStatus={item.approvalStatus}
              isPending={isPublishPending ? publishVariables?.contentId === item._id : null}
              onToggle={(status) =>
                setContentPublish({ contentId: item._id, publishStatus: status })
              }
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
                  href={ROUTE_ORG_COURSE_MODULE_CONTENT_EDIT(courseId, moduleId, row.original._id)}
                  className="flex items-center">
                  {t('buttons.edit')}
                </Link>
              </DropdownMenuItem>
              {row.original.fileKey ? (
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  <a
                    href={getFileFullUrl(row.original.fileKey)}
                    download
                    target="_blank"
                    rel="noopener noreferrer">
                    {t('buttons.download')}
                  </a>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => handleDeleteContent(row.original._id)}>
                {t('buttons.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [
      handleOpenDialog,
      handleDeleteContent,
      courseId,
      moduleId,
      t,
      isPublishPending,
      publishVariables,
      setContentPublish,
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
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-5">
          <h2 className="text-xl font-medium">{t('title')}</h2>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-red-500">{t('error', { message: error.message })}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        <h2 className="text-xl font-medium">{t('title')}</h2>
        <Link
          href={ROUTE_ORG_COURSE_MODULE_CONTENT_ADD_NEW(courseId, moduleId)}
          className="cursor-pointer">
          <Button variant="default">
            <PlusIcon />
            {t('addContent')}
          </Button>
        </Link>
      </div>

      {/* Search Input */}
      <div className="flex items-center space-x-2 p-5">
        <div className="relative w-full flex-1">
          <IconSearch className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <DataTable<IContent>
        data={contents}
        columns={columns}
        onReorder={handleReorder}
        getRowId={(row) => row._id}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        onChangeData={setContents}
        pageSize={100}
      />

      {/* Description Edit Dialog */}
      <Dialog
        open={!!openRowId}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDialog();
          }
        }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('dialogs.editDescription.title')}</DialogTitle>
            <DialogDescription>{t('dialogs.editDescription.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('dialogs.editDescription.label')}</span>
              <Input
                value={tempDescription}
                onChange={(e) => setTempDescription(e.target.value)}
                placeholder={t('dialogs.editDescription.placeholder')}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={handleCloseDialog}>
                {t('buttons.cancel')}
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => openRowId && handleSaveDescription(openRowId)}>
              {t('buttons.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContentDataTable;
