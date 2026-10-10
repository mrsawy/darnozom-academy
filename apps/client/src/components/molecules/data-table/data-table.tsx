'use client';

import * as React from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconLayoutColumns,
} from '@tabler/icons-react';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
  type FilterFn,
  type Updater,
} from '@tanstack/react-table';
import { Button } from '@/components/atoms/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/atoms/dropdown-menu';
import { Label } from '@/components/atoms/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { Tabs, TabsContent } from '@/components/atoms/tabs';
import { useLocale, useTranslations } from 'next-intl';
import { DataTableSkeleton } from './data-table.skeleton';

export const SortableRowHandleContext = React.createContext<{
  attributes: React.HTMLAttributes<Element>;
  listeners: unknown;
} | null>(null);

function DraggableRow<TData>({ row }: { row: Row<TData> }) {
  const { transform, transition, setNodeRef, isDragging, attributes, listeners } = useSortable({
    id: row.id,
  });

  return (
    <TableRow
      data-state={row.getIsSelected() && 'selected'}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition, // Disable transition during drag
      }}>
      <SortableRowHandleContext.Provider value={{ attributes, listeners }}>
        {row.getVisibleCells().map((cell) => (
          <TableCell className="py-4" key={cell.id} style={{ verticalAlign: 'top' }}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </SortableRowHandleContext.Provider>
    </TableRow>
  );
}

export interface DataTableProps<TData> {
  data: TData[];
  columns?: ColumnDef<TData, unknown>[];
  headers?: ColumnDef<TData, unknown>[];
  getRowId?: (row: TData, index: number) => UniqueIdentifier;
  onUpdate?: (row: TData) => void | Promise<void>;
  onDelete?: (row: TData) => void | Promise<void>;
  enableRowSelection?: boolean;
  pageSize?: number;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  manualPagination?: boolean;
  pageCount?: number;
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
  pagination?: { pageIndex: number; pageSize: number };
  isLoading?: boolean;
}

export function DataTable<TData>({
  data,
  onChangeData: setData,
  columns: columnsProp,
  headers,
  getRowId,
  onUpdate,
  onDelete,
  enableRowSelection = true,
  pageSize = 10,
  onReorder,
  // onDeleteSelected,
  globalFilter,
  onGlobalFilterChange,
  manualPagination = false,
  pageCount,
  onPaginationChange,
  pagination: externalPagination,
  isLoading = false,
}: DataTableProps<TData> & {
  onReorder?: (newData: TData[]) => void;
  // onDeleteSelected?: (data: string[]) => void;
  onChangeData?: (data: TData[]) => void;
}) {
  const t = useTranslations('DataTable');
  // const [data, setData] = React.useState<TData[]>(() => initialData)
  // const [isDragging, setIsDragging] = React.useState(false);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [internalPagination, setInternalPagination] = React.useState({
    pageIndex: 0,
    pageSize: pageSize,
  });
  const [globalFilterState, setGlobalFilterState] = React.useState(globalFilter ?? '');

  // Use external pagination if provided (for manual pagination), otherwise use internal
  const pagination =
    manualPagination && externalPagination ? externalPagination : internalPagination;

  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const deriveRowId = React.useCallback(
    (row: TData, index: number): UniqueIdentifier => {
      if (getRowId) return getRowId(row, index);
      const anyRow = row as unknown as { id?: string | number };
      return anyRow?.id ?? `${index}`;
    },
    [getRowId]
  );

  const dataIds = React.useMemo<UniqueIdentifier[]>(() => {
    return data?.map((row, index) => deriveRowId(row, index)) || [];
  }, [data, deriveRowId]);

  // Sync global filter state with prop
  React.useEffect(() => {
    if (globalFilter !== undefined) {
      setGlobalFilterState(globalFilter);
    }
  }, [globalFilter]);

  // Handle global filter change
  const handleGlobalFilterChange = React.useCallback(
    (value: string) => {
      setGlobalFilterState(value);
      onGlobalFilterChange?.(value);
    },
    [onGlobalFilterChange]
  );

  const resolvedColumns = React.useMemo<ColumnDef<TData, unknown>[]>(() => {
    const provided = columnsProp ?? headers;
    if (provided && provided.length > 0) {
      const hasActions = provided.some((c) => c.id === 'actions');
      if ((onUpdate || onDelete) && !hasActions) {
        return [
          ...provided,
          {
            id: 'actions',
            cell: ({ row }) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                    size="icon">
                    <IconDotsVertical />
                    <span className="sr-only">{t('openMenu')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  {onUpdate ? (
                    <DropdownMenuItem onClick={() => void onUpdate(row.original)}>
                      {t('edit')}
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem>{t('makeACopy')}</DropdownMenuItem>
                  <DropdownMenuItem>{t('favorite')}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {onDelete ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        void onDelete(row.original);
                      }}>
                      {t('delete')}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem variant="destructive">{t('delete')}</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } as ColumnDef<TData, unknown>,
        ];
      }
      return provided;
    }
    return [] as unknown as ColumnDef<TData, unknown>[];
  }, [columnsProp, headers, onDelete, onUpdate, t]);

  const deepSearchFn = React.useCallback<FilterFn<TData>>(
    (row: Row<TData>, columnId: string, filterValue: unknown) => {
      const value = row.getValue(columnId);
      if (typeof value !== 'string' || typeof filterValue !== 'string') return false;
      return value.toLowerCase().includes(filterValue.toLowerCase());
    },
    []
  );

  const handlePaginationChange = React.useCallback(
    (updater: Updater<{ pageIndex: number; pageSize: number }>) => {
      if (manualPagination && onPaginationChange) {
        // For manual pagination, calculate new state and call external handler
        const currentPagination = externalPagination ?? internalPagination;
        const newPagination = typeof updater === 'function' ? updater(currentPagination) : updater;
        onPaginationChange(newPagination);
      } else {
        // For client-side pagination, update internal state
        const newPagination = typeof updater === 'function' ? updater(internalPagination) : updater;
        setInternalPagination(newPagination);
      }
    },
    [manualPagination, onPaginationChange, externalPagination, internalPagination]
  );

  const table = useReactTable({
    data,
    // onDataChange: setData,
    columns: resolvedColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      globalFilter: globalFilterState,
    },
    getRowId: (row, index) => deriveRowId(row, index).toString(),
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: handlePaginationChange,
    onGlobalFilterChange: handleGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: manualPagination ? undefined : getFilteredRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: deepSearchFn,
    manualPagination,
    pageCount: manualPagination ? pageCount : undefined,
  });

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (active && over && active.id !== over.id) {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const final = arrayMove(data, oldIndex, newIndex);
          setData?.(final);
          onReorder?.(final);
        }
      }
    },
    [data, dataIds, setData, onReorder]
  );
  const locale = useLocale();
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <Tabs dir={direction} defaultValue="outline" className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        {/* <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        <Select defaultValue="outline">
          <SelectTrigger
            className="flex w-fit @4xl/main:hidden"
            size="sm"
            id="view-selector"
          >
            Actions
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1" className="cursor-pointer"><Trash2Icon /> Delete selected Items</SelectItem>
          </SelectContent>
        </Select> */}

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">{t('customizeColumns')}</span>
                <span className="lg:hidden">{t('columns')}</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter((column) => column.accessorFn !== undefined && column.getCanHide())
                .map((column) => {
                  // console.log({ column })
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}>
                      {column.columnDef.header as string}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* <Button variant="outline" size="sm">
            <IconPlus />
            <span className="hidden lg:inline">Add Section</span>
          </Button> */}
        </div>
      </div>
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          {isLoading ? (
            <DataTableSkeleton columnCount={resolvedColumns.length || 5} rowCount={pageSize} />
          ) : (
            <DndContext
              key={dataIds.join('-')}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
              sensors={sensors}
              id={sortableId}>
              <Table dir="auto">
                <TableHeader className="bg-muted sticky top-0 z-0">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id} colSpan={header.colSpan}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="**:data-[slot=table-cell]:first:w-8">
                  {table.getRowModel().rows?.length ? (
                    <SortableContext
                      key={dataIds.join('-')}
                      items={dataIds}
                      strategy={verticalListSortingStrategy}>
                      {table.getRowModel().rows.map((row) => (
                        <DraggableRow key={row.id} row={row} />
                      ))}
                    </SortableContext>
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={resolvedColumns.length}
                        className="m-5 h-36 rounded-2xl text-center">
                        {t('noResults')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DndContext>
          )}
        </div>
        <div className="dir-ltr flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {t('rowsSelected', {
              selected: table.getFilteredSelectedRowModel().rows.length,
              total: table.getFilteredRowModel().rows.length,
            })}
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                {t('rowsPerPage')}
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}>
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50, 100].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              {t('page', {
                current: table.getState().pagination.pageIndex + 1,
                total:
                  manualPagination && pageCount !== undefined ? pageCount : table.getPageCount(),
              })}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}>
                <span className="sr-only">{t('ariaLabels.goToFirstPage')}</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}>
                <span className="sr-only">{t('ariaLabels.goToPreviousPage')}</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}>
                <span className="sr-only">{t('ariaLabels.goToNextPage')}</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}>
                <span className="sr-only">{t('ariaLabels.goToLastPage')}</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="past-performance" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed" />
      </TabsContent>
      <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed" />
      </TabsContent>
      <TabsContent value="focus-documents" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed" />
      </TabsContent>
    </Tabs>
  );
}
