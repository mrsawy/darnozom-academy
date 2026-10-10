'use client';

import { useState } from 'react';
import { IconCopy, IconTrash } from '@tabler/icons-react';
import Image from 'next/image';
import { GalleryItem as IGalleryItem } from '@/lib/hooks/gallery/useGallery';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import useGeneralStore from '@/lib/store/generalStore';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';

interface GalleryItemProps {
  item: IGalleryItem;
  onCopy: (url: string) => void;
  onClick: () => void;
  onDelete: (id: string) => Promise<void>;
  deleting?: boolean;
}

export function GalleryItem({
  item,
  onCopy,
  onClick,
  onDelete,
  deleting = false,
}: GalleryItemProps) {
  const t = useTranslations('GalleryItem');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      useGeneralStore.setState({ generalIsLoading: true });
      await onDelete(item._id);
      setIsDeleteDialogOpen(false);
      toast.success(t('imageDeleted'));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('failedToDelete');
      toast.error(errorMessage);
    } finally {
      useGeneralStore.setState({ generalIsLoading: false });
    }
  };

  return (
    <>
      <div
        className="group bg-card relative aspect-square cursor-pointer overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md md:hover:-translate-y-1"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        role="button"
        tabIndex={0}>
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(item.url);
            }}
            className="cursor-pointer rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            title={t('copyURL')}>
            <IconCopy size={20} />
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={deleting}
            className="cursor-pointer rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-red-500/70 disabled:cursor-not-allowed disabled:opacity-50"
            title={t('delete')}>
            <IconTrash size={20} />
          </button>
        </div>

        {item.type?.startsWith('image/') ? (
          <Image
            src={item.url}
            alt={item.title ?? t('galleryItemFallback')}
            fill
            className="object-cover"
          />
        ) : (
          <div className="bg-secondary/30 flex h-full w-full flex-col items-center justify-center p-4">
            <div className="mb-2 text-4xl">📄</div>
            <span className="text-muted-foreground w-full truncate px-2 text-center text-xs">
              {item.title}
            </span>
          </div>
        )}

        <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <p className="truncate text-xs font-medium">{item.title}</p>
          <p className="text-[10px] text-white/70">
            {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteImage')}</DialogTitle>
            <DialogDescription>
              {t('deleteConfirm', { title: item.title ?? 'this image' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setIsDeleteDialogOpen(false)}
              // className="px-4 py-2 text-sm font-medium rounded-md border border-border bg-background hover:bg-accent transition-colors"
              variant="outline"
              disabled={deleting}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleConfirmDelete();
              }}
              variant="destructive"
              effect="expandIcon"
              icon={IconTrash}
              disabled={deleting}>
              {deleting ? t('deleting') : t('deleteButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
