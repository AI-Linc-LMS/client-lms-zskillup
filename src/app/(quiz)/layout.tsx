import type { ReactNode } from 'react';
import { CartProvider } from '@/components/billing/CartProvider';
import { CheckoutPhoneProvider } from '@/components/billing/CheckoutPhoneProvider';

/**
 * Quiz route-group layout. The adaptive runner lives here and surfaces the
 * PaywallCard, so it needs the purchase cart in scope (CartProvider). The cart is
 * localStorage-backed, so items added here appear on /cart in the student group too.
 * CheckoutPhoneProvider settles the mobile number the paywall's checkout opens with.
 */
export default function QuizLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <CheckoutPhoneProvider>{children}</CheckoutPhoneProvider>
    </CartProvider>
  );
}
