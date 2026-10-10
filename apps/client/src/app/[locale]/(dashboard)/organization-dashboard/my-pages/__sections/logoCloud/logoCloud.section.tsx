import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  textField,
  textareaField,
  colorFields,
  selectField,
  arrayField,
  imageField,
  animationField,
} from '../utils';
import Image from 'next/image';
import { getRenderableImageSrc } from '@/lib/utils/image-src';
import type { LogoCloudSectionProps, LogoCloudItem } from './types';

export const LogoCloudSection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      ...colorFields,
      layout: selectField([
        { label: 'Grid', value: 'grid' },
        { label: 'Marquee', value: 'marquee' },
        { label: 'Centered', value: 'centered' },
      ]),
      logoSize: selectField([
        { label: 'Small', value: 'h-8' },
        { label: 'Medium', value: 'h-12' },
        { label: 'Large', value: 'h-16' },
        { label: 'Extra Large', value: 'h-20' },
      ]),
      grayscale: selectField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      animation: animationField,
      logos: arrayField({
        name: textField(true),
        image: imageField,
        link: textField(false),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Trusted by Leading Organizations',
      subtitle: 'Join thousands of companies already using our platform',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      layout: 'grid',
      logoSize: 'h-12',
      grayscale: 'yes',
      animation: 'fade',
      logos: [
        { name: 'Company 1', image: '', link: '#' },
        { name: 'Company 2', image: '', link: '#' },
        { name: 'Company 3', image: '', link: '#' },
        { name: 'Company 4', image: '', link: '#' },
        { name: 'Company 5', image: '', link: '#' },
        { name: 'Company 6', image: '', link: '#' },
        { name: 'Company 7', image: '', link: '#' },
        { name: 'Company 8', image: '', link: '#' },
      ],
    },
    render: ({
      title,
      subtitle,
      backgroundColor,
      textColor,
      layout,
      logoSize,
      grayscale,
      animation,
      logos,
      ...props
    }: LogoCloudSectionProps) => {
      const styleProps = getStyleProps(props);
      const animationClass =
        animation === 'fade' ? 'animate-fadeIn' : animation === 'slide' ? 'animate-slideUp' : '';
      const grayscaleClass =
        grayscale === 'yes' ? 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100' : '';
      const logosArray: LogoCloudItem[] = Array.isArray(logos) ? logos : [];

      if (layout === 'marquee') {
        return (
          <div className="overflow-hidden px-6 py-20" style={{ ...styleProps, backgroundColor }}>
            <div className="mx-auto max-w-7xl">
              <div className="mb-12 text-center">
                <h2 className="mb-4 text-3xl font-bold md:text-4xl" style={{ color: textColor }}>
                  {title}
                </h2>
                {subtitle ? (
                  <p className="text-lg opacity-80" style={{ color: textColor }}>
                    {subtitle}
                  </p>
                ) : null}
              </div>
              <div className="relative">
                <div className="animate-marquee flex gap-12">
                  {[...logosArray, ...logosArray].map((logo: LogoCloudItem, idx: number) => {
                    const logoImgSrc = getRenderableImageSrc(logo.image);
                    return (
                      <div
                        key={idx}
                        className={`flex flex-shrink-0 items-center justify-center ${grayscaleClass} transition-all duration-300`}>
                        {logoImgSrc ? (
                          <Image
                            src={logoImgSrc}
                            alt={logo.name}
                            width={128}
                            height={128}
                            className={`${logoSize} w-auto object-contain`}
                          />
                        ) : (
                          <div
                            className={`${logoSize} flex w-32 items-center justify-center rounded-lg bg-gray-200 text-xs font-semibold`}
                            style={{ color: textColor }}>
                            {logo.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (layout === 'centered') {
        return (
          <div className="px-6 py-20" style={{ ...styleProps, backgroundColor }}>
            <div className="mx-auto max-w-5xl">
              <div className="mb-12 text-center">
                <h2 className="mb-4 text-3xl font-bold md:text-4xl" style={{ color: textColor }}>
                  {title}
                </h2>
                {subtitle ? (
                  <p className="text-lg opacity-80" style={{ color: textColor }}>
                    {subtitle}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
                {logosArray.map((logo: LogoCloudItem, idx: number) => {
                  const logoImgSrc = getRenderableImageSrc(logo.image);
                  return (
                    <div
                      key={idx}
                      className={`${animationClass} ${grayscaleClass} transition-all duration-300`}
                      style={{ animationDelay: `${idx * 100}ms` }}>
                      {logo.link ? (
                        <a href={logo.link} className="block">
                          {logoImgSrc ? (
                            <Image
                              src={logoImgSrc}
                              alt={logo.name ?? ''}
                              width={128}
                              height={128}
                              className={`${logoSize ?? ''} w-auto object-contain`}
                            />
                          ) : (
                            <div
                              className={`${logoSize ?? ''} flex w-32 items-center justify-center rounded-lg bg-gray-200 text-xs font-semibold`}
                              style={{ color: textColor }}>
                              {logo.name}
                            </div>
                          )}
                        </a>
                      ) : logoImgSrc ? (
                        <Image
                          src={logoImgSrc}
                          alt={logo.name ?? ''}
                          width={128}
                          height={128}
                          className={`${logoSize ?? ''} w-auto object-contain`}
                        />
                      ) : (
                        <div
                          className={`${logoSize ?? ''} flex w-32 items-center justify-center rounded-lg bg-gray-200 text-xs font-semibold`}
                          style={{ color: textColor }}>
                          {logo.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      // Grid layout
      return (
        <div className="px-6 py-20" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl" style={{ color: textColor }}>
                {title}
              </h2>
              {subtitle ? (
                <p className="text-lg opacity-80" style={{ color: textColor }}>
                  {subtitle}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-8 md:grid-cols-3 md:gap-12 lg:grid-cols-4">
              {logosArray.map((logo: LogoCloudItem, idx: number) => {
                const logoImgSrc = getRenderableImageSrc(logo.image);
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-center ${animationClass} ${grayscaleClass} transition-all duration-300`}
                    style={{ animationDelay: `${idx * 100}ms` }}>
                    {logo.link ? (
                      <a href={logo.link} className="block">
                        {logoImgSrc ? (
                          <Image
                            src={logoImgSrc}
                            alt={logo.name ?? ''}
                            width={128}
                            height={128}
                            className={`${logoSize ?? ''} mx-auto w-auto object-contain`}
                          />
                        ) : (
                          <div
                            className={`${logoSize ?? ''} flex w-full items-center justify-center rounded-lg bg-gray-200 text-xs font-semibold`}
                            style={{ color: textColor }}>
                            {logo.name}
                          </div>
                        )}
                      </a>
                    ) : logoImgSrc ? (
                      <Image
                        src={logoImgSrc}
                        alt={logo.name ?? ''}
                        width={128}
                        height={128}
                        className={`${logoSize ?? ''} mx-auto w-auto object-contain`}
                      />
                    ) : (
                      <div
                        className={`${logoSize ?? ''} flex w-full items-center justify-center rounded-lg bg-gray-200 text-xs font-semibold`}
                        style={{ color: textColor }}>
                        {logo.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    },
  };
};

export default LogoCloudSection;
