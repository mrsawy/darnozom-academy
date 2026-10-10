'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  CreditCard,
  Banknote,
  Truck,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart } from '@/lib/context/cart-context';
import { useUser } from '@/lib/hooks/user/use-user.hook';
import { getMedusaClient } from '@/lib/medusa-client';
import {
  ROUTE_CART,
  ROUTE_CHECKOUT_SUCCESS,
  ROUTE_BOOKS,
} from '@/lib/data/constants/routes.constants';

export default function CheckoutPage() {
  const t = useTranslations('checkout');
  const router = useRouter();
  const { cart, items, subtotal, total, currency, hasPaperItems, clearCart } = useCart();
  const { data: user } = useUser();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card' | 'paypal'>('cod');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill user information if logged in
  useEffect(() => {
    if (user) {
      if (user.firstName && !firstName) setFirstName(user.firstName);
      if (user.lastName && !lastName) setLastName(user.lastName);
      if (user.email && !email) setEmail(user.email);
      if (user.phone && !phone) setPhone(user.phone);
    }
  }, [user]);

  // If cart is empty, redirect to cart page
  useEffect(() => {
    if (!cart && items.length === 0) {
      // Allow time for cart hydration
      const timer = setTimeout(() => {
        if (items.length === 0) router.replace(ROUTE_CART);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [cart, items, router]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart?.id) return;

    // Validate required fields
    if (!email || !firstName || !lastName || !phone) {
      setErrorMessage(t('validation.requiredFields'));
      return;
    }

    if (hasPaperItems && (!city || !address)) {
      setErrorMessage(t('validation.addressRequired'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const sdk = getMedusaClient();

      // 1. Update cart customer info and address in Medusa
      await sdk.store.cart.update(cart.id, {
        email,
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          phone,
          address_1: address || 'Digital delivery',
          city: city || 'Cairo',
          country_code: 'eg',
        },
      });

      // 2. Complete order via Medusa Store API
      const result = await sdk.store.cart.complete(cart.id);

      const orderId =
        result && 'order' in result && result.order ? (result.order as { id: string }).id : cart.id;

      // 3. Clear cart and navigate to success page
      clearCart();
      router.push(`${ROUTE_CHECKOUT_SUCCESS}?order_id=${encodeURIComponent(orderId)}`);
    } catch (err) {
      console.error('Checkout failed:', err);
      // Even if payment gateway webhook is simulated or mock in dev, handle gracefully:
      const msg = err instanceof Error ? err.message : t('errors.generic');
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h2 className="text-xl font-bold mb-2">{t('emptyCart')}</h2>
        <Button asChild>
          <Link href={ROUTE_BOOKS}>{t('backToStore')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={ROUTE_CART}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          <span>{t('backToCart')}</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {errorMessage && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('contactInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">{t('firstName')}</Label>
                    <Input
                      id="firstName"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t('firstNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">{t('lastName')}</Label>
                    <Input
                      id="lastName"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t('lastNamePlaceholder')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{t('phone')}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Shipping Address (Shown if cart has physical books) */}
            {hasPaperItems && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{t('shippingAddress')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="city">{t('city')}</Label>
                    <Input
                      id="city"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t('cityPlaceholder')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address">{t('address')}</Label>
                    <Input
                      id="address"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t('addressPlaceholder')}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 3. Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('paymentMethod')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Cash on Delivery (only if paper items exist) */}
                {hasPaperItems && (
                  <label
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="mt-1 accent-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <Banknote className="h-4 w-4 text-primary" />
                        <span>{t('methods.cod')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('methods.codDesc')}
                      </p>
                    </div>
                  </label>
                )}

                {/* Credit Card / Mada */}
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'card'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="mt-1 accent-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span>{t('methods.card')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('methods.cardDesc')}
                    </p>
                  </div>
                </label>

                {/* PayPal */}
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'paypal'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={() => setPaymentMethod('paypal')}
                    className="mt-1 accent-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <span>PayPal</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('methods.paypalDesc')}
                    </p>
                  </div>
                </label>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">{t('summary')}</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Mini items list */}
                <div className="space-y-3 max-h-60 overflow-y-auto pe-1">
                  {items.map((item) => (
                    <div key={item.lineItemId} className="flex items-center gap-3 text-xs">
                      <div className="h-10 w-8 bg-muted rounded overflow-hidden shrink-0 flex items-center justify-center">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-muted-foreground">
                          {item.quantity} × {item.unitPrice} {currency}
                        </p>
                      </div>
                      <div className="font-semibold text-foreground">
                        {item.total} {currency}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-3 border-t text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('subtotal')}</span>
                    <span>
                      {subtotal} {currency}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('shipping')}</span>
                    <span>{hasPaperItems ? t('standardShipping') : t('free')}</span>
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-between items-baseline">
                  <span className="font-bold text-sm text-foreground">{t('grandTotal')}</span>
                  <span className="font-extrabold text-xl text-primary">
                    {total} {currency}
                  </span>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full font-bold gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('processing')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('placeOrder')}</span>
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{t('encryptedSecurity')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
