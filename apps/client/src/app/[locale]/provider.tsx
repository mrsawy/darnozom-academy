'use client';

import { ReactNode, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CartProvider } from '@/lib/context/cart-context';

interface ProviderProps {
  children: ReactNode;
  locale: string;
  messages: Record<string, unknown>;
}

export default function Provider({ children, locale, messages }: ProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <QueryClientProvider client={queryClient}>
        <CartProvider>{children}</CartProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}
