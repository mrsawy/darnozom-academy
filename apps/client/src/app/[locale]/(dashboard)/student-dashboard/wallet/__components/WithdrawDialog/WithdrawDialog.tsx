'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
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
import { Textarea } from '@/components/atoms/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/atoms/radio-group';
import { Alert, AlertDescription } from '@/components/atoms/alert';
import { Badge } from '@/components/atoms/badge';
import { Loader2, AlertCircle, Smartphone, Building2, CreditCard, ChevronLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import { WithdrawalMethod } from '@darnozom/shared-types';
import { useCreateWithdrawalRequest } from '@/lib/hooks/withdrawal/use-withdrawal';
import {
  buildWithdrawAmountSchema,
  buildMobileWalletDetailsSchema,
  buildBankTransferDetailsSchema,
  buildCreditCardDetailsSchema,
} from './WithdrawDialog.schema';

type Step = 'amount' | 'method' | 'details' | 'review';

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  currentBalance: number;
  onSuccess?: () => void;
}

const METHOD_ICONS = {
  [WithdrawalMethod.MOBILE_WALLET]: Smartphone,
  [WithdrawalMethod.BANK_TRANSFER]: Building2,
  [WithdrawalMethod.CREDIT_CARD]: CreditCard,
};

export function WithdrawDialog({
  open,
  onOpenChange,
  currency,
  currentBalance,
  onSuccess,
}: WithdrawDialogProps) {
  const t = useTranslations('Wallet.withdraw');
  const withdrawAmountSchema = useMemo(() => buildWithdrawAmountSchema(t), [t]);
  const mobileWalletDetailsSchema = useMemo(() => buildMobileWalletDetailsSchema(t), [t]);
  const bankTransferDetailsSchema = useMemo(() => buildBankTransferDetailsSchema(t), [t]);
  const creditCardDetailsSchema = useMemo(() => buildCreditCardDetailsSchema(t), [t]);

  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod | null>(null);
  const [methodDetails, setMethodDetails] = useState<Record<string, string>>({});
  const [userNote, setUserNote] = useState('');
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});

  const { mutate: createRequest, isPending } = useCreateWithdrawalRequest();

  const amountForm = useForm({
    resolver: yupResolver(withdrawAmountSchema),
  });

  const numAmount = Number.parseFloat(amount);
  const exceedsBalance = !Number.isNaN(numAmount) && numAmount > currentBalance;

  const handleClose = () => {
    setStep('amount');
    setAmount('');
    setSelectedMethod(null);
    setMethodDetails({});
    setUserNote('');
    setDetailErrors({});
    amountForm.reset();
    onOpenChange(false);
  };

  const handleAmountNext = amountForm.handleSubmit((data) => {
    if (data.amount > currentBalance) {
      amountForm.setError('amount', {
        message: t('validation.exceedsBalance', { currency, balance: currentBalance.toFixed(2) }),
      });
      return;
    }
    setAmount(String(data.amount));
    setStep('method');
  });

  const handleMethodNext = () => {
    if (!selectedMethod) {
      toast.error(t('validation.selectMethod'));
      return;
    }
    setStep('details');
  };

  const validateDetails = async (): Promise<boolean> => {
    try {
      const schema =
        selectedMethod === WithdrawalMethod.MOBILE_WALLET
          ? mobileWalletDetailsSchema
          : selectedMethod === WithdrawalMethod.BANK_TRANSFER
            ? bankTransferDetailsSchema
            : creditCardDetailsSchema;

      await schema.validate(methodDetails, { abortEarly: false });
      setDetailErrors({});
      return true;
    } catch (err: unknown) {
      const errors: Record<string, string> = {};
      if (err && typeof err === 'object' && 'inner' in err) {
        const yupErr = err as { inner: { path?: string; message: string }[] };
        for (const e of yupErr.inner) {
          if (e.path) errors[e.path] = e.message;
        }
      }
      setDetailErrors(errors);
      return false;
    }
  };

  const handleDetailsNext = async () => {
    const valid = await validateDetails();
    if (valid) setStep('review');
  };

  const handleSubmit = () => {
    if (!selectedMethod) return;

    createRequest(
      {
        amount: numAmount,
        currency,
        method: selectedMethod,
        methodDetails: methodDetails as never,
        userNote: userNote || undefined,
      },
      {
        onSuccess: () => {
          toast.success(t('success.requestCreated'));
          handleClose();
          onSuccess?.();
        },
      }
    );
  };

  const renderAmountStep = () => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleAmountNext();
      }}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="withdraw-amount">{t('amount', { currency })}</Label>
          <Input
            id="withdraw-amount"
            type="number"
            step="0.01"
            min="0.01"
            max={currentBalance}
            placeholder="0.00"
            {...amountForm.register('amount', { valueAsNumber: true })}
          />
          {amountForm.formState.errors.amount ? (
            <p className="text-destructive text-sm">{amountForm.formState.errors.amount.message}</p>
          ) : null}
          {exceedsBalance ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t('validation.amountExceedsBalance')}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={handleClose}>
          {t('cancel')}
        </Button>
        <Button type="submit">{t('next')}</Button>
      </DialogFooter>
    </form>
  );

  const METHODS = [
    {
      value: WithdrawalMethod.MOBILE_WALLET,
      labelKey: 'methods.mobileWallet.label' as const,
      descKey: 'methods.mobileWallet.description' as const,
    },
    {
      value: WithdrawalMethod.BANK_TRANSFER,
      labelKey: 'methods.bankTransfer.label' as const,
      descKey: 'methods.bankTransfer.description' as const,
    },
    {
      value: WithdrawalMethod.CREDIT_CARD,
      labelKey: 'methods.creditCard.label' as const,
      descKey: 'methods.creditCard.description' as const,
    },
  ] as const;

  const renderMethodStep = () => (
    <div>
      <div className="grid gap-3 py-4">
        <RadioGroup
          value={selectedMethod ?? ''}
          onValueChange={(v) => setSelectedMethod(v as WithdrawalMethod)}>
          {METHODS.map(({ value, labelKey, descKey }) => {
            const Icon = METHOD_ICONS[value];
            return (
              <label
                key={value}
                htmlFor={`method-${value}`}
                className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors ${
                  selectedMethod === value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}>
                <RadioGroupItem value={value} id={`method-${value}`} />
                <Icon className="text-muted-foreground h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">{t(labelKey)}</p>
                  <p className="text-muted-foreground text-sm">{t(descKey)}</p>
                </div>
              </label>
            );
          })}
        </RadioGroup>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setStep('amount')}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>
        <Button onClick={handleMethodNext} disabled={!selectedMethod}>
          {t('next')}
        </Button>
      </DialogFooter>
    </div>
  );

  const renderDetailsStep = () => {
    const field = (key: string, label: string, placeholder: string, type = 'text') => (
      <div key={key} className="grid gap-2">
        <Label htmlFor={`detail-${key}`}>{label}</Label>
        <Input
          id={`detail-${key}`}
          type={type}
          placeholder={placeholder}
          value={methodDetails[key] ?? ''}
          onChange={(e) => setMethodDetails((prev) => ({ ...prev, [key]: e.target.value }))}
        />
        {detailErrors[key] ? <p className="text-destructive text-sm">{detailErrors[key]}</p> : null}
      </div>
    );

    const fields =
      selectedMethod === WithdrawalMethod.MOBILE_WALLET
        ? [
            field('phoneNumber', t('details.phoneNumber'), '+20 1XX XXX XXXX', 'tel'),
            field('providerName', t('details.providerName'), t('details.providerNamePlaceholder')),
          ]
        : selectedMethod === WithdrawalMethod.BANK_TRANSFER
          ? [
              field('iban', t('details.iban'), 'EG00 0000 0000 0000 0000 0000 0000'),
              field('bankName', t('details.bankName'), t('details.bankNamePlaceholder')),
              field(
                'accountHolderName',
                t('details.accountHolderName'),
                t('details.accountHolderNamePlaceholder')
              ),
            ]
          : [
              field(
                'cardHolderName',
                t('details.cardHolderName'),
                t('details.cardHolderNamePlaceholder')
              ),
              field('cardLastFour', t('details.cardLastFour'), '1234', 'text'),
            ];

    return (
      <div>
        <div className="grid gap-4 py-4">{fields}</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setStep('method')}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Button>
          <Button onClick={() => void handleDetailsNext()}>{t('next')}</Button>
        </DialogFooter>
      </div>
    );
  };

  const renderReviewStep = () => (
    <div>
      <div className="grid gap-4 py-4">
        <div className="bg-muted/50 space-y-3 rounded-lg p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('review.amount')}</span>
            <span className="font-semibold">
              {currency} {numAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('review.method')}</span>
            <Badge variant="secondary">
              {selectedMethod
                ? t(
                    `methods.${selectedMethod === WithdrawalMethod.MOBILE_WALLET ? 'mobileWallet' : selectedMethod === WithdrawalMethod.BANK_TRANSFER ? 'bankTransfer' : 'creditCard'}.label`
                  )
                : ''}
            </Badge>
          </div>
          {Object.entries(methodDetails).map(([key, val]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted-foreground capitalize">
                {key.replaceAll(/([A-Z])/g, ' $1')}
              </span>
              <span className="max-w-[55%] truncate text-right font-medium">{val}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="user-note">{t('review.noteLabel')}</Label>
          <Textarea
            id="user-note"
            placeholder={t('review.notePlaceholder')}
            value={userNote}
            onChange={(e) => setUserNote(e.target.value)}
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setStep('details')} disabled={isPending}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('submitRequest')}
        </Button>
      </DialogFooter>
    </div>
  );

  const STEPS: Step[] = ['amount', 'method', 'details', 'review'];
  const stepIndex = STEPS.indexOf(step);

  const STEP_TITLES: Record<Step, string> = {
    amount: t('steps.amount'),
    method: t('steps.method'),
    details: t('steps.details'),
    review: t('steps.review'),
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description', { currency, balance: currentBalance.toFixed(2) })}
          </DialogDescription>
          <div className="mt-2 flex gap-1">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= stepIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-muted-foreground text-sm">{STEP_TITLES[step]}</p>
        </DialogHeader>

        {step === 'amount' && renderAmountStep()}
        {step === 'method' && renderMethodStep()}
        {step === 'details' && renderDetailsStep()}
        {step === 'review' && renderReviewStep()}
      </DialogContent>
    </Dialog>
  );
}
