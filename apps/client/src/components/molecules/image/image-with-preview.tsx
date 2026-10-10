import { Dialog, DialogContent, DialogTrigger } from '@/components/atoms/dialog';
import Image from './image';

export default function ImageWithPreview({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="cursor-pointer rounded-lg"
        />
      </DialogTrigger>
      {/* Optimized view for large image */}
      <DialogContent className="max-w-screen-lg border-0 bg-transparent p-0">
        <Image src={src} alt={alt} width={600} height={400} className="rounded-lg object-contain" />
      </DialogContent>
    </Dialog>
  );
}
