// app/student-dashboard/wallet/__components/AddFundsDialog.tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Loader2, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { toast } from 'react-toastify';
import { useCreatePaymentLink } from '@/lib/hooks/wallet/use-wallet';
import { Alert, AlertDescription } from '@/components/atoms/alert';
import { RadioGroup, RadioGroupItem } from '@/components/atoms/radio-group';
import {
  PaymentProvider,
  PaymentMethod,
  PaymentPurpose,
  PaymentOption,
} from '@/lib/types/payment/payment.interface';
import { useTranslations } from 'next-intl';

interface AddFundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  onSuccess?: () => void;
}

// Payment options will be created dynamically with translations

const MIN_AMOUNTS: Record<string, number> = {
  USD: 1,
  EUR: 1,
  GBP: 1,
  EGP: 50,
};

const MAX_AMOUNTS: Record<string, number> = {
  USD: 10_000,
  EUR: 10_000,
  GBP: 10_000,
  EGP: 200_000,
};

export function AddFundsDialog({ open, onOpenChange, currency, onSuccess }: AddFundsDialogProps) {
  const t = useTranslations('Wallet.addFunds');
  const [amount, setAmount] = useState('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [description, setDescription] = useState('');

  const { mutate: createPayment, isPending } = useCreatePaymentLink();

  // Define payment options with translations
  const PAYMENT_OPTIONS: PaymentOption[] = [
    {
      id: 'paymob-card',
      provider: PaymentProvider.PAYMOB,
      method: PaymentMethod.CREDIT_CARD,
      name: t('paymentOptions.creditCard.name'),
      description: t('paymentOptions.creditCard.description'),
      icon: CreditCard,
      logo: '💳',
      currencies: ['EGP', 'USD', 'EUR'],
    },
    {
      id: 'paymob-wallet',
      provider: PaymentProvider.PAYMOB,
      method: PaymentMethod.MOBILE_WALLET,
      name: t('paymentOptions.mobileWallet.name'),
      description: t('paymentOptions.mobileWallet.description'),
      icon: Smartphone,
      logo: '📱',
      currencies: ['EGP'],
    },
    {
      id: 'paypal',
      provider: PaymentProvider.PAYPAL,
      method: PaymentMethod.PAYPAL,
      name: t('paymentOptions.paypal.name'),
      description: t('paymentOptions.paypal.description'),
      icon: Wallet,
      logo: '🅿️',
      currencies: ['USD', 'EUR', 'EGP'],
    },
  ];

  // Filter options that support the current currency
  const availableOptions = PAYMENT_OPTIONS.filter((option) => option.currencies.includes(currency));

  const minAmount = MIN_AMOUNTS[currency] || 1;
  const maxAmount = MAX_AMOUNTS[currency] || 100_000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = Number.parseFloat(amount);

    // Find selected payment option
    const paymentOption = availableOptions.find((opt) => opt.id === selectedOption);

    if (!paymentOption) {
      toast.error(t('validation.selectPaymentMethod'));
      return;
    }

    // Validation
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      toast.error(t('validation.invalidAmount'));
      return;
    }

    if (numAmount < minAmount) {
      toast.error(t('validation.minAmount', { currency, min: minAmount }));
      return;
    }

    if (numAmount > maxAmount) {
      toast.error(t('validation.maxAmount', { currency, max: maxAmount }));
      return;
    }

    // Check decimal places
    const decimalPlaces = (amount.split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      toast.error(t('validation.decimalPlaces'));
      return;
    }

    createPayment(
      {
        amount: numAmount,
        currency,
        provider: paymentOption.provider,
        method: paymentOption.method,
        purpose: PaymentPurpose.WALLET_CREDIT,
        metadata: {
          description: description || 'Add funds to wallet',
          integrationId: paymentOption.integrationId,
        },
      },
      {
        onSuccess: () => {
          setAmount('');
          setDescription('');
          setSelectedOption('');
          onSuccess?.();
        },
      }
    );
  };

  // Auto-select first option if none selected
  if (!selectedOption && availableOptions.length > 0) {
    setSelectedOption(availableOptions[0].id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(e);
          }}>
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Payment Method Selection */}
            <div className="grid gap-3">
              <Label>{t('paymentMethod')}</Label>
              {availableOptions.length === 0 ? (
                <Alert>
                  <AlertDescription>{t('noPaymentMethods', { currency })}</AlertDescription>
                </Alert>
              ) : (
                <RadioGroup
                  value={selectedOption}
                  onValueChange={setSelectedOption}
                  disabled={isPending}>
                  <div className="grid gap-3">
                    {availableOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = selectedOption === option.id;

                      return (
                        <label
                          key={option.id}
                          htmlFor={option.id}
                          className={`hover:border-primary/50 flex cursor-pointer items-center space-x-3 rounded-lg border-2 p-4 transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'} ${isPending ? 'cursor-not-allowed opacity-50' : ''} `}>
                          <RadioGroupItem value={option.id} id={option.id} />
                          <div className="flex flex-1 items-center gap-3">
                            <div className="text-2xl">{option.logo}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 font-semibold">
                                {option.name}
                              </div>
                              <div className="text-muted-foreground text-sm">
                                {option.description}
                              </div>
                            </div>
                            <Icon className="text-muted-foreground h-5 w-5" />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </RadioGroup>
              )}
            </div>

            {/* Amount Input */}
            <div className="grid gap-2">
              <Label htmlFor="amount">{t('amount', { currency })}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={minAmount}
                max={maxAmount}
                placeholder={t('amountPlaceholder', { min: minAmount, max: maxAmount })}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={isPending || availableOptions.length === 0}
                className="text-lg"
              />
              <p className="text-muted-foreground text-xs">
                {t('amountHint', { currency, min: minAmount, max: maxAmount })}
              </p>
            </div>

            {/* Description (Optional) */}
            <div className="grid gap-2">
              <Label htmlFor="description">{t('descriptionLabel')}</Label>
              <Input
                id="description"
                type="text"
                placeholder={t('descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
                maxLength={100}
              />
            </div>

            {/* Summary */}
            {amount && Number.parseFloat(amount) > 0 && selectedOption ? (
              <div className="bg-muted rounded-lg p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{t('summary.amount')}</span>
                  <span className="font-semibold">
                    {currency} {Number.parseFloat(amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    {t('summary.paymentMethod')}
                  </span>
                  <span className="font-semibold">
                    {availableOptions.find((p) => p.id === selectedOption)?.name}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isPending || availableOptions.length === 0 || !selectedOption}
              effect="expandIcon"
              iconPlacement="right">
              {t('proceedToPayment')}
              {isPending ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
