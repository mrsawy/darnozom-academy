import NextImage, { ImageProps } from 'next/image';
const BROKEN_IMAGE_SRC = '/broken-image.svg';

function Image({ src, alt, ...rest }: ImageProps) {
  return <NextImage src={src || BROKEN_IMAGE_SRC} alt={alt} {...rest} />;
}

export default Image;
