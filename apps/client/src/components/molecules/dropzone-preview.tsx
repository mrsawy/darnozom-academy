'use client';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/atoms/dropzone';
import { DropzoneOptions } from 'react-dropzone';
import { useTranslations } from 'next-intl';
function DropzoneWithPreview({
  className,
  files,
  handleDrop,
  filePreview,
  accept,
  maxFiles,
  maxSize,
  onError,
}: {
  handleDrop: (files: File[]) => void;
  filePreview?: string | null;
  className?: string;
  files: File[] | undefined;
  accept: DropzoneOptions['accept'];
  maxFiles: DropzoneOptions['maxFiles'];
  maxSize?: DropzoneOptions['maxSize'];
  onError?: (error: Error) => void;
}) {
  const t = useTranslations('DropzonePreview');
  // const [files, setFiles] = useState<File[] | undefined>();
  // const [filePreview, setFilePreview] = useState<string | undefined>();
  // const handleDrop = (files: File[]) => {
  //     console.log(files);
  //     setFiles(files);
  //     if (files.length > 0) {
  //         const reader = new FileReader();
  //         reader.onload = (e) => {
  //             if (typeof e.target?.result === 'string') {
  //                 setFilePreview(e.target?.result);
  //             }
  //         };
  //         reader.readAsDataURL(files[0]);
  //     }
  // };
  const isVideo = files?.[0]?.type.startsWith('video/') ?? false;

  return (
    <Dropzone
      accept={
        accept ?? {
          'image/*': ['.png', '.jpg', '.jpeg'],
          'video/*': ['.mp4', '.avi', '.mov', '.wmv'],
        }
      }
      onDrop={handleDrop}
      maxSize={maxSize}
      onError={(error) => {
        onError?.(error);
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      }}
      src={files}
      className={className}
      maxFiles={maxFiles ?? 1}>
      <DropzoneEmptyState />
      <DropzoneContent>
        {filePreview ? (
          <div className="h-[102px] w-full">
            {isVideo ? (
              <video
                className="absolute top-0 left-0 h-full w-full object-cover"
                src={filePreview}
                controls>
                <track kind="captions" />
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={t('previewAlt')}
                className="absolute top-0 left-0 h-full w-full object-cover"
                src={filePreview}
              />
            )}
          </div>
        ) : null}
      </DropzoneContent>
    </Dropzone>
  );
}
export default DropzoneWithPreview;
