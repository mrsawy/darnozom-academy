import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  imageField,
  selectField,
  textField,
  colorField,
} from '../utils';
import Image from 'next/image';
import { getRenderableImageSrc } from '@/lib/utils/image-src';
import type { ImageSectionProps } from './types';
import { useTranslations } from 'next-intl';

export const ImageSection = () => {
  return {
    fields: {
      ...styleFields,
      image: imageField,
      alt: textField(true), // contentEditable for alt text might be overkill, but consistent
      aspectRatio: selectField([
        { label: 'Auto', value: 'auto' },
        { label: '16:9', value: 'video' },
        { label: '4:3', value: 'standard' },
        { label: '1:1', value: 'square' },
        { label: '21:9', value: 'ultrawide' },
      ]),
      objectFit: selectField([
        { label: 'Cover', value: 'cover' },
        { label: 'Contain', value: 'contain' },
        { label: 'Fill', value: 'fill' },
      ]),
      height: selectField([
        { label: 'Auto', value: 'auto' },
        { label: 'Small (200px)', value: 'h-48' },
        { label: 'Medium (400px)', value: 'h-96' },
        { label: 'Large (600px)', value: 'h-[600px]' },
        { label: 'Full Screen', value: 'h-screen' },
      ]),
      caption: textField(true),
      borderRadius: selectField([
        { label: 'None', value: 'rounded-none' },
        { label: 'Small', value: 'rounded-sm' },
        { label: 'Medium', value: 'rounded-md' },
        { label: 'Large', value: 'rounded-lg' },
        { label: 'Full', value: 'rounded-full' },
      ]),
      overlayOpacity: selectField([
        { label: 'None', value: '0' },
        { label: 'Low', value: '0.2' },
        { label: 'Medium', value: '0.5' },
        { label: 'High', value: '0.8' },
      ]),
      overlayColor: colorField(),
    },
    defaultProps: {
      ...defaultStyleProps,
      image:
        'https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1950&q=80',
      alt: 'Image description',
      aspectRatio: 'auto',
      objectFit: 'cover',
      height: 'auto',
      caption: '',
      borderRadius: 'rounded-lg',
      overlayOpacity: '0',
      overlayColor: '#000000',
    },
    render: function ImageSectionRender({
      image,
      alt,
      aspectRatio,
      objectFit,
      height,
      caption,
      borderRadius,
      overlayOpacity,
      overlayColor,
      ...props
    }: ImageSectionProps) {
      const t = useTranslations('MyPagesSections');

      const styleProps = getStyleProps(props);
      const imageSrc = getRenderableImageSrc(image);

      const aspectClass =
        {
          auto: '',
          video: 'aspect-video',
          standard: 'aspect-[4/3]',
          square: 'aspect-square',
          ultrawide: 'aspect-[21/9]',
        }[aspectRatio ?? 'auto'] ?? '';

      const overlayOpacityNum = overlayOpacity ? Number.parseFloat(overlayOpacity) : 0;

      return (
        <div style={styleProps} className="w-full">
          <div
            className={`relative w-full overflow-hidden ${borderRadius ?? ''} ${height === 'auto' ? '' : (height ?? '')} ${aspectClass}`}>
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={alt ?? ''}
                fill
                className={`object-${objectFit ?? 'cover'}`}
                sizes="100vw"
              />
            ) : (
              <div className="flex h-64 w-full items-center justify-center bg-gray-200 text-gray-400">
                {t('selectAnImage')}
              </div>
            )}

            {/* Overlay */}
            {overlayOpacityNum > 0 && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{ backgroundColor: overlayColor, opacity: overlayOpacityNum }}
              />
            )}
          </div>
          {caption ? <p className="mt-2 text-center text-sm text-gray-500">{caption}</p> : null}
        </div>
      );
    },
  };
};

export default ImageSection;
