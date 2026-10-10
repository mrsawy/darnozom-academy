'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useGallery, type UploadProgress } from '@/lib/hooks/gallery/useGallery';
import { GalleryHeader } from './__sections/GalleryHeader';
import { GalleryGrid } from './__sections/GalleryGrid';
import { EmptyState } from './__sections/EmptyState';
import { UploadZone } from './__components/UploadZone';
import { ImageModal } from './__components/ImageModal';
import { useTranslations } from 'next-intl';

export default function GalleryPage() {
  const t = useTranslations('GalleryPage');
  const [progress, setProgress] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onProgress = useCallback((progressEvent: UploadProgress) => {
    setProgress(progressEvent.percentage);
  }, []);

  const {
    items,
    loading,
    uploading,
    deleting,
    uploadFile,
    deleteFile,
    loadMore,
    hasMore,
    loadingMore,
  } = useGallery({ onProgress });

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setProgress(0);
        await uploadFile(acceptedFiles[0]);
      }
    },
    [uploadFile]
  );

  const handleItemClick = useCallback((index: number) => {
    setSelectedIndex(index);
    setIsModalOpen(true);
  }, []);

  const handleCopy = useCallback(
    async (url: string) => {
      await navigator.clipboard.writeText(url);
      toast.success(t('urlCopied'));
    },
    [t]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteFile(id);
        // Close modal if no items remain
        if (items.length === 1) {
          setIsModalOpen(false);
        }
      } catch {
        // Error is handled by the hook
      }
    },
    [deleteFile, items.length]
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <div className="animate-in fade-in space-y-8 p-8 duration-500">
      <GalleryHeader itemCount={items.length} />

      <UploadZone onDrop={(e) => void handleDrop(e)} uploading={uploading} progress={progress} />

      {items.length === 0 && !loading ? (
        <EmptyState />
      ) : (
        <GalleryGrid
          items={items}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={() => {
            void loadMore();
          }}
          onItemClick={handleItemClick}
          onCopy={(url: string) => {
            void handleCopy(url);
          }}
          onDelete={handleDelete}
          deleting={deleting}
        />
      )}

      <ImageModal
        items={items}
        initialIndex={selectedIndex}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDelete={(id: string) => {
          void handleDelete(id);
        }}
        deleting={deleting}
      />
    </div>
  );
}
