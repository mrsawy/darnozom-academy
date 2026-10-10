'use client';

import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { cn } from '@/lib/utils';

import type { QrCodeProps } from './qr-code.types';

/**
 * Renders a QR code as SVG (scales cleanly, works with `qrcode.react` defaults).
 * For canvas export (`toDataURL`), import `QRCodeCanvas` from `qrcode.react` directly.
 */
export const QrCode = forwardRef<SVGSVGElement, QrCodeProps>(function QrCode(
  { className, size = 128, marginSize = 1, title = 'QR code', value, ...rest },
  ref
) {
  return (
    <QRCodeSVG
      ref={ref}
      className={cn('shrink-0', className)}
      size={size}
      marginSize={marginSize}
      title={title}
      value={value}
      {...rest}
    />
  );
});
