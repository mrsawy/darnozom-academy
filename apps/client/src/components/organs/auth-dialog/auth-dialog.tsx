'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import React, { useState } from 'react';
import { LoginForm } from '@/app/[locale]/(auth)/__components/login-form';
import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { SignupForm } from '@/app/[locale]/(auth)/__components/signup-form';

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  /** Overrides default "Authentication Required" */
  title?: string;
  /** Overrides default course-enrollment copy */
  description?: string;
  /** Runs after successful login or signup, before the dialog closes */
  onAuthenticated?: () => void;
}

export const AuthDialog = React.memo<AuthDialogProps>(
  ({ open, onClose, title, description, onAuthenticated }: AuthDialogProps) => {
    const t = useTranslations('AuthDialog');
    const pathname = usePathname();
    const [authState, setAuthState] = useState<'login' | 'signup'>('login');

    const handleAuthSuccess = () => {
      onAuthenticated?.();
      onClose();
    };

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="container sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title ?? t('defaultTitle')}</DialogTitle>
            <DialogDescription>{description ?? t('defaultDescription')}</DialogDescription>
          </DialogHeader>
          {authState === 'login' && (
            <LoginForm
              redirectUrl={pathname}
              onSignupClick={() => setAuthState('signup')}
              onSuccess={handleAuthSuccess}
              withImage={false}
            />
          )}
          {authState === 'signup' && (
            <SignupForm
              redirectUrl={pathname}
              onLoginClick={() => setAuthState('login')}
              onSuccess={handleAuthSuccess}
              withImage={false}
            />
          )}
          <DialogFooter />
        </DialogContent>
      </Dialog>
    );
  }
);

export default AuthDialog;
