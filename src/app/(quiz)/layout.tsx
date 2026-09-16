import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { CartProvider } from '@/components/billing/CartProvider';
import { CheckoutPhoneProvider } from '@/components/billing/CheckoutPhoneProvider';

/**
 * Quiz route-group layout. The adaptive runner lives here and surfaces the
 * PaywallCard, so it needs the purchase cart in scope (CartProvider). The cart is
 * localStorage-backed, so items added here appear on /cart in the student group too.
 * CheckoutPhoneProvider settles the mobile number the paywall's checkout opens with.
 *
 * The Toaster is the one piece of AppShell this Zone B group still needs: it is a portal,
 * not chrome, and without it every purchase toast (unlocked / payment failed / the mobile
 * prompt's own messages) would be pushed into a store nothing renders.
 */
export default function QuizLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <CheckoutPhoneProvider>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{ style: { borderRadius: '12px', fontFamily: 'var(--font-sans)' } }}
          richColors
        />
      </CheckoutPhoneProvider>
    </CartProvider>
  );
}
