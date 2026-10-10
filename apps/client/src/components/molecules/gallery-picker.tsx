'use client';

import { useState } from 'react';
import { useGallery, type UploadProgress } from '@/lib/hooks/gallery/useGallery';
import { IconPhoto, IconX } from '@tabler/icons-react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { getRenderableImageSrc } from '@/lib/utils/image-src';
import { useTranslations } from 'next-intl';

interface GalleryPickerProps {
  value?: string;
  onChange: (value: string) => void;
}

export function GalleryPicker({ value, onChange }: GalleryPickerProps) {
  const t = useTranslations('GalleryPicker');
  const [isOpen, setIsOpen] = useState(false);
  const previewSrc = getRenderableImageSrc(value);

  return (
    <div className="w-full">
      {previewSrc ? (
        <div className="relative mb-2 aspect-video w-full overflow-hidden rounded-md border bg-gray-100">
          <Image src={previewSrc} alt={t('selectedAlt')} fill className="object-cover" />
          <button
            type="button"
            className="absolute top-2 right-2 rounded-full bg-white/80 p-1 text-gray-700 hover:bg-white"
            onClick={() => onChange('')}>
            <IconX size={16} />
          </button>
        </div>
      ) : null}

      <button
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-2 text-gray-500 transition-colors hover:border-purple-500 hover:text-purple-500"
        onClick={() => setIsOpen(true)}
        type="button">
        <IconPhoto size={20} />
        {previewSrc ? t('changeImage') : t('selectFromGallery')}
      </button>

      {isOpen ? (
        <GalleryModal
          onClose={() => setIsOpen(false)}
          onSelect={(url) => {
            onChange(url);
            setIsOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function GalleryModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const t = useTranslations('GalleryPicker');
  const [progress, setProgress] = useState(0);

  const onProgress = (progressEvent: UploadProgress) => {
    setProgress(progressEvent.percentage);
  };

  const { items, loading, uploading, uploadFile } = useGallery({ onProgress });
  // const [dragActive, setDragActive] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles?.length > 0) {
      const file = acceptedFiles[0];
      if (file) {
        void uploadFile(file).then((result) => {
          if (result?.url) {
            // Determine if we should auto-select. Maybe not, let user see it.
          }
        });
      }
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-bold">{t('mediaGallery')}</h3>
          <button
            type="button"
            tabIndex={0}
            aria-label={t('closeGallery')}
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100">
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${uploading ? 'bg-gray-50 opacity-50' : 'hover:border-purple-500 hover:bg-purple-50'}`}>
            <input {...getInputProps()} />
            {uploading ? (
              <div className="bg-background/90 absolute inset-0 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                <div className="w-full max-w-md space-y-4">
                  <div className="text-primary flex items-center justify-between text-sm font-medium">
                    <span>{t('uploading')}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <IconPhoto className="mx-auto h-10 w-10 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">{t('clickOrDragToUpload')}</p>
                <p className="text-xs text-gray-500">{t('maxSize')}</p>
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-500">{t('allImages')}</h4>
            {loading ? (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
                {items.map((item) => (
                  <div
                    key={item._id}
                    role="button"
                    tabIndex={0}
                    aria-label={t('selectNamed', { name: item.title ?? t('imageFallbackTitle') })}
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border hover:ring-2 hover:ring-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    onClick={() => onSelect(item.url)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(item.url);
                      }
                    }}>
                    <Image
                      src={item.url}
                      alt={item.title ?? t('imageAlt')}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                      <span className="translate-y-2 transform rounded bg-white/90 px-2 py-1 text-xs font-semibold opacity-0 shadow-sm transition-all group-hover:translate-y-0 group-hover:opacity-100">
                        {t('select')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
