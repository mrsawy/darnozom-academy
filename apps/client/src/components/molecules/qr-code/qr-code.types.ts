import type { ComponentPropsWithoutRef } from 'react';

export type QrCodeProps = ComponentPropsWithoutRef<(typeof import('qrcode.react'))['QRCodeSVG']>;
