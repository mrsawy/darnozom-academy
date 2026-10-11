'use client';

import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { ToastContainer } from 'react-toastify';
import Spinner from '@/components/organs/spinner';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { QueryClientProvider } from '@tanstack/react-query';
import ClickSpark from '@/components/ClickSpark';
import AuthSessionListener from '@/lib/realtime/auth-session-listener';
import { GlobalAuthDialog } from '@/components/organs/auth-dialog/global-auth-dialog';
import { queryClient } from '@/lib/utils/query/query-client';
import { CartProvider } from '@/lib/context/cart-context';

interface ProviderProps {
  children: ReactNode;
  locale: string;
  messages: Record<string, string>;
}

export default function Provider({ children, locale, messages }: ProviderProps) {
  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
          <QueryClientProvider client={queryClient}>
            <NextThemesProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange>
              <ClickSpark sparkSize={10} sparkRadius={15} sparkCount={8} duration={400}>
                <AuthSessionListener locale={locale} />
                <GlobalAuthDialog />
                <CartProvider>{children}</CartProvider>
              </ClickSpark>
            </NextThemesProvider>
          </QueryClientProvider>
        </NextIntlClientProvider>
      </div>

      <ToastContainer theme="dark" />
      <Spinner />
    </div>
  );
}
