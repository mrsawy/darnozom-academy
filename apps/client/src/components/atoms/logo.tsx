import { LOGO_URL } from '@/lib/data/constants';
import Image, { ImageProps } from 'next/image';

export default function Logo({ ...props }: Partial<ImageProps>) {
  return <Image src={LOGO_URL} width={40} height={40} alt="Darnozom Logo" {...props} />;
}
