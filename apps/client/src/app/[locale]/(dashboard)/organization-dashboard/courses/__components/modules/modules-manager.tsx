'use client';

import { useState, useEffect } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/atoms/dialog';
import { reorderCourseModules } from '@/lib/actions/courses/modules.action';
import { Button } from '@/components/atoms/button';
import { PublishToggle } from '@/components/molecules/publish-toggle';
import { SortableItem } from '../sortable-item';
import CreateModuleForm from './create-module-form';
import { IModule } from '@/lib/types/course/modules.interface';
import { useTranslations } from 'next-intl';
import { useSetModulePublishStatus } from '@/lib/hooks/course/usePublishStatus';

export default function ModulesManager({
  courseId,
  initialModules,
}: {
  courseId: string;
  initialModules: IModule[];
}) {
  const t = useTranslations('ModulesManager');
  const [open, setOpen] = useState(false);
  const [modules, setModules] = useState<IModule[]>(initialModules);
  const {
    mutate: setModulePublish,
    isPending: isPublishPending,
    variables: publishVariables,
  } = useSetModulePublishStatus();

  // Update local state when initialModules prop changes (after revalidation)
  useEffect(() => {
    setModules(initialModules);
  }, [initialModules]);

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = modules.findIndex((m) => m._id === active.id);
    const newIndex = modules.findIndex((m) => m._id === over.id);
    const newOrderList = arrayMove(modules, oldIndex, newIndex);
    setModules(newOrderList);
    try {
      await reorderCourseModules(
        courseId,
        newOrderList.map((m) => m._id)
      );
    } catch {
      setModules(modules);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">{t('title')}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="default">{t('addModule')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createModule')}</DialogTitle>
            </DialogHeader>
            <CreateModuleForm setOpen={setOpen} courseId={courseId} />
          </DialogContent>
        </Dialog>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
        <SortableContext items={modules.map((m) => m._id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {modules.map((m) => (
              <SortableItem key={m._id} id={m._id}>
                <li className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{m.title}</div>
                      {m.description ? (
                        <div className="text-muted-foreground text-sm">{m.description}</div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PublishToggle
                        publishStatus={m.publishStatus}
                        approvalStatus={m.approvalStatus}
                        isPending={isPublishPending ? publishVariables?.moduleId === m._id : null}
                        onToggle={(status) =>
                          setModulePublish({ moduleId: m._id, publishStatus: status })
                        }
                      />
                    </div>
                  </div>
                </li>
              </SortableItem>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
