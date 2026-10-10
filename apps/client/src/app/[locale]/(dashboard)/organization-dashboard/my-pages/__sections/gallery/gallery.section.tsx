/* eslint-disable @next/next/no-img-element */
import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  textField,
  textareaField,
  colorField,
  colorFields,
  selectField,
  arrayField,
  imageField,
  linkField,
} from '../utils';
import type { GallerySectionProps, GalleryItem } from './types';

const colsMap: Record<string, string> = {
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-2 lg:grid-cols-3',
  '4': 'sm:grid-cols-2 lg:grid-cols-4',
};

const GallerySection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      eyebrow: textField(true),
      ...colorFields,
      accentColor: colorField(),
      layout: selectField([
        { label: 'Grid', value: 'grid' },
        { label: 'Masonry', value: 'masonry' },
        { label: 'Featured (first large)', value: 'featured' },
      ]),
      columns: selectField([
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
        { label: '4 Columns', value: '4' },
      ]),
      aspectRatio: selectField([
        { label: 'Square (1:1)', value: 'aspect-square' },
        { label: 'Landscape (4:3)', value: 'aspect-4/3' },
        { label: 'Widescreen (16:9)', value: 'aspect-video' },
        { label: 'Portrait (3:4)', value: 'aspect-3/4' },
      ]),
      borderRadius: selectField([
        { label: 'None', value: 'rounded-none' },
        { label: 'Small', value: 'rounded-lg' },
        { label: 'Medium', value: 'rounded-xl' },
        { label: 'Large', value: 'rounded-2xl' },
      ]),
      gap: selectField([
        { label: 'Tight (4px)', value: 'gap-1' },
        { label: 'Small (8px)', value: 'gap-2' },
        { label: 'Medium (16px)', value: 'gap-4' },
        { label: 'Large (24px)', value: 'gap-6' },
      ]),
      hoverEffect: selectField([
        { label: 'Zoom', value: 'zoom' },
        { label: 'Lift', value: 'lift' },
        { label: 'Darken overlay', value: 'darken' },
        { label: 'None', value: 'none' },
      ]),
      showCaptions: selectField([
        { label: 'Always', value: 'always' },
        { label: 'On Hover', value: 'hover' },
        { label: 'Hidden', value: 'hidden' },
      ]),
      images: arrayField({
        image: imageField,
        caption: textField(true),
        link: linkField(),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Our Gallery',
      subtitle: 'A glimpse into our learning community, events, and campus life',
      eyebrow: 'Gallery',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      accentColor: '#7c3aed',
      layout: 'grid',
      columns: '3',
      aspectRatio: 'aspect-square',
      borderRadius: 'rounded-xl',
      gap: 'gap-4',
      hoverEffect: 'zoom',
      showCaptions: 'hover',
      images: [
        { image: '', caption: 'Live coding workshop', link: '' },
        { image: '', caption: 'Student graduation ceremony', link: '' },
        { image: '', caption: 'Instructor Q&A session', link: '' },
        { image: '', caption: 'Community hackathon', link: '' },
        { image: '', caption: 'Online mentoring session', link: '' },
        { image: '', caption: 'Career fair networking', link: '' },
      ],
    },
    render: ({
      title,
      subtitle,
      eyebrow,
      backgroundColor,
      textColor,
      accentColor,
      layout,
      columns,
      aspectRatio,
      borderRadius,
      gap,
      hoverEffect,
      showCaptions,
      images,
      ...props
    }: GallerySectionProps) => {
      const styleProps = getStyleProps(props);
      const imagesArr: GalleryItem[] = Array.isArray(images) ? images : [];
      const primary = accentColor ?? '#7c3aed';

      const hoverImgClass =
        {
          zoom: 'transition-transform duration-500 group-hover:scale-110',
          lift: 'transition-transform duration-300',
          darken: 'transition-all duration-300',
          none: '',
        }[hoverEffect ?? 'zoom'] ?? 'transition-transform duration-500 group-hover:scale-110';

      const wrapHoverClass =
        {
          zoom: '',
          lift: 'hover:-translate-y-2 hover:shadow-2xl',
          darken: '',
          none: '',
        }[hoverEffect ?? 'zoom'] ?? '';

      function ImageCard({ item, className = '' }: { item: GalleryItem; className?: string }) {
        const content = (
          <div
            className={`group relative overflow-hidden transition-all duration-300 ${borderRadius ?? 'rounded-xl'} ${wrapHoverClass} ${className}`}>
            {item.image ? (
              <img
                src={item.image}
                alt={item.caption ?? ''}
                className={`h-full w-full object-cover ${hoverImgClass}`}
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${primary}15 0%, #4f46e510 100%)` }}>
                <span className="text-4xl opacity-30">🖼</span>
              </div>
            )}

            {/* Darken overlay on hover */}
            {hoverEffect === 'darken' && (
              <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/40" />
            )}

            {/* Caption */}
            {item.caption && showCaptions !== 'hidden' ? (
              <div
                className={`absolute inset-x-0 bottom-0 p-4 transition-all duration-300 ${showCaptions === 'hover' ? 'translate-y-full group-hover:translate-y-0' : ''}`}
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                <p className="text-sm font-semibold text-white">{item.caption}</p>
              </div>
            ) : null}
          </div>
        );

        return item.link ? <a href={item.link}>{content}</a> : content;
      }

      const header = [eyebrow, title, subtitle].some(Boolean) && (
        <div className="mb-12 text-center">
          {eyebrow ? (
            <p
              className="mb-3 text-sm font-extrabold tracking-widest uppercase"
              style={{ color: primary }}>
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2
              className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl"
              style={{ color: textColor }}>
              {title}
            </h2>
          ) : null}
          {subtitle ? <p className="mx-auto max-w-2xl text-lg text-gray-500">{subtitle}</p> : null}
        </div>
      );

      if (layout === 'featured' && imagesArr.length > 0) {
        const [first, ...rest] = imagesArr;
        return (
          <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
            <div className="mx-auto max-w-7xl">
              {header}
              <div className={`grid grid-cols-1 ${gap ?? 'gap-4'} md:grid-cols-2`}>
                <div className={`${aspectRatio ?? 'aspect-square'} md:row-span-2 md:aspect-auto`}>
                  <ImageCard item={first} className="h-full" />
                </div>
                {rest.slice(0, 4).map((item, idx) => (
                  <div key={idx} className={aspectRatio ?? 'aspect-square'}>
                    <ImageCard item={item} className="h-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      if (layout === 'masonry') {
        const mid = Math.ceil(imagesArr.length / 2);
        const col1 = imagesArr.slice(0, mid);
        const col2 = imagesArr.slice(mid);
        return (
          <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
            <div className="mx-auto max-w-7xl">
              {header}
              <div className={`grid grid-cols-1 ${gap ?? 'gap-4'} sm:grid-cols-2`}>
                <div className={`flex flex-col ${gap ?? 'gap-4'}`}>
                  {col1.map((item, idx) => (
                    <ImageCard key={idx} item={item} />
                  ))}
                </div>
                <div className={`flex flex-col ${gap ?? 'gap-4'} sm:mt-8`}>
                  {col2.map((item, idx) => (
                    <ImageCard key={idx} item={item} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Grid (default)
      return (
        <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            {header}
            <div
              className={`grid grid-cols-1 ${gap ?? 'gap-4'} ${colsMap[columns ?? '3'] ?? 'sm:grid-cols-2 lg:grid-cols-3'}`}>
              {imagesArr.map((item, idx) => (
                <div key={idx} className={aspectRatio ?? 'aspect-square'}>
                  <ImageCard item={item} className="h-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    },
  };
};

export default GallerySection;
