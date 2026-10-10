'use client';

import React, { type SyntheticEvent } from 'react';

import ImageCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from '@/components/atoms/dialog';
import { FileWithPath } from 'react-dropzone';

import 'react-image-crop/dist/ReactCrop.css';

import { CropIcon, Trash2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type FileWithPreview = FileWithPath & {
  preview: string;
};

interface ImageCropperProps {
  dialogOpen: boolean;
  setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedFile: FileWithPreview | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<FileWithPreview | null>>;
  /** Crop box aspect ratio (width / height). Default 1 (square). */
  aspect?: number;
  /** When true, only the dialog is rendered; open it programmatically (no avatar trigger). */
  hideTrigger?: boolean;
  /** If set, "Crop" produces a `File` and invokes this instead of only storing a preview on the trigger. */
  onCropped?: (file: File, dataUrl: string) => void;
}

async function dataURLtoFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const base = filename.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${base}.png`, { type: 'image/png' });
}

export function ImageCropper({
  dialogOpen,
  setDialogOpen,
  selectedFile,
  setSelectedFile,
  aspect: aspectProp = 1,
  hideTrigger = false,
  onCropped,
}: ImageCropperProps) {
  const t = useTranslations('ImageCropper');
  const aspect = aspectProp;

  const imgRef = React.useRef<HTMLImageElement | null>(null);

  const [crop, setCrop] = React.useState<Crop>();
  const [croppedImageUrl, setCroppedImageUrl] = React.useState<string>('');
  const [croppedImage, setCroppedImage] = React.useState<string>('');

  React.useEffect(() => {
    setCrop(undefined);
    setCroppedImageUrl('');
  }, [selectedFile?.preview]);

  function onImageLoad(e: SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  }

  function onCropComplete(crop: PixelCrop) {
    if (imgRef.current && crop.width && crop.height) {
      const croppedImageUrl = getCroppedImg(imgRef.current, crop);
      setCroppedImageUrl(croppedImageUrl);
    }
  }

  function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): string {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.imageSmoothingEnabled = false;

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width * scaleX,
        crop.height * scaleY
      );
    }

    return canvas.toDataURL('image/png', 1);
  }

  async function onCrop() {
    try {
      if (!croppedImageUrl) {
        return;
      }
      if (onCropped) {
        const file = await dataURLtoFile(croppedImageUrl, selectedFile?.name ?? 'image.png');
        onCropped(file, croppedImageUrl);
        setSelectedFile(null);
        setCroppedImage('');
        setCroppedImageUrl('');
        setDialogOpen(false);
        return;
      }
      setCroppedImage(croppedImageUrl);
      setDialogOpen(false);
    } catch {
      alert('Something went wrong!');
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {hideTrigger ? null : (
        <DialogTrigger>
          <Avatar className="size-36 cursor-pointer ring-2 ring-slate-200 ring-offset-2">
            <AvatarImage src={croppedImage || selectedFile?.preview} alt={t('avatarAlt')} />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <div className="m-2 min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          <ImageCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => onCropComplete(c)}
            aspect={aspect}
            className="block w-full max-w-full">
            {/* Native img: AvatarImage forces aspect-square and small default sizing, which breaks crop preview. */}
            {selectedFile?.preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- needs ref + natural dimensions for canvas crop
              <img
                ref={imgRef}
                alt=""
                src={selectedFile.preview}
                onLoad={onImageLoad}
                className="mx-auto block h-auto max-h-[min(72vh,800px)] w-full max-w-full object-contain"
              />
            ) : (
              <div className="bg-muted text-muted-foreground flex min-h-[min(72vh,800px)] w-full items-center justify-center rounded-md text-sm">
                {t('loading')}
              </div>
            )}
          </ImageCrop>
        </div>
        <DialogFooter className="justify-center p-6 pt-0">
          <DialogClose asChild>
            <Button
              size="sm"
              type="reset"
              className="w-fit"
              variant="outline"
              onClick={() => {
                setSelectedFile(null);
              }}>
              <Trash2Icon className="mr-1.5 size-4" />
              {t('cancel')}
            </Button>
          </DialogClose>
          <Button type="submit" size="sm" className="w-fit" onClick={() => void onCrop()}>
            <CropIcon className="mr-1.5 size-4" />
            {t('crop')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to center the crop
export function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 50,
        height: 50,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}
