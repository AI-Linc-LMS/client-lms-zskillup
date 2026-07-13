'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { getMe } from '@/lib/api/me';
import type { BillingPeriod, EntitlementScope } from '@/shared/enums';

/** One line the student has added to their cart (pre-checkout, client-side). The
 *  amount is always (re)priced server-side at checkout — we keep only what to buy. */
export interface CartItem {
  scope: EntitlementScope;
  scopeRef: string | null;
  period: BillingPeriod;
  /** Human label for the cart list, e.g. "Profit & Loss" or "TCS". */
  label: string;
}

export const cartKey = (i: Pick<CartItem, 'scope' | 'scopeRef' | 'period'>): string =>
  `${i.scope}:${i.scopeRef ?? ''}:${i.period}`;

interface CartContextValue {
  items: CartItem[];
  count: number;
  add: (item: CartItem) => void;
  remove: (key: string) => void;
  clear: () => void;
  has: (scope: EntitlementScope, scopeRef: string | null) => boolean;
  setPeriod: (key: string, period: BillingPeriod) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * The cart used to live under ONE global localStorage key. localStorage is scoped
 * to the BROWSER, not the account — so signing out and into a second account on the
 * same machine loaded the first account's cart (and vice-versa), showing plans that
 * belonged to someone else. The key is now namespaced per user id.
 */
const LEGACY_STORAGE_KEY = 'zsk_cart_v1';
const storageKeyFor = (userId: string) => `zsk_cart_v1:${userId}`;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Identify the signed-in user FIRST, then load only that user's cart.
  useEffect(() => {
    let alive = true;

    // Drop the old shared cart. We deliberately do NOT migrate it into the current
    // user's cart — we can't know which account it belonged to, and adopting it
    // would just re-create the leak. A pre-checkout cart is cheap to rebuild.
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* private mode */
    }

    getMe()
      .then((me) => {
        if (!alive) return;
        setUserId(me.id);
        try {
          const raw = localStorage.getItem(storageKeyFor(me.id));
          setItems(raw ? (JSON.parse(raw) as CartItem[]) : []);
        } catch {
          setItems([]); // malformed cart
        }
        setHydrated(true);
      })
      .catch(() => {
        // Signed out / not a student — start empty. Never inherit another account's cart.
        if (!alive) return;
        setUserId(null);
        setItems([]);
        setHydrated(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  // Persist under THIS user's key (never while signed out, or we'd write a cart
  // with no owner that the next account could pick up).
  useEffect(() => {
    if (!hydrated || !userId) return;
    try {
      localStorage.setItem(storageKeyFor(userId), JSON.stringify(items));
    } catch {
      /* quota / private mode — cart just won't persist */
    }
  }, [items, hydrated, userId]);

  const add = useCallback((item: CartItem) => {
    setItems((prev) =>
      prev.some((p) => cartKey(p) === cartKey(item)) ? prev : [...prev, item],
    );
  }, []);
  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((p) => cartKey(p) !== key));
  }, []);
  const clear = useCallback(() => setItems([]), []);
  const has = useCallback(
    (scope: EntitlementScope, scopeRef: string | null) =>
      items.some((p) => p.scope === scope && p.scopeRef === scopeRef),
    [items],
  );
  const setPeriod = useCallback((key: string, period: BillingPeriod) => {
    setItems((prev) => prev.map((p) => (cartKey(p) === key ? { ...p, period } : p)));
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({ items, count: items.length, add, remove, clear, has, setPeriod }),
    [items, add, remove, clear, has, setPeriod],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}

/** Null-safe cart access — returns null outside a CartProvider (e.g. admin/TPO
 *  areas that share the TopBar). Lets shared chrome opt into the cart gracefully. */
export function useCartOptional(): CartContextValue | null {
  return useContext(CartContext);
}

/** Header cart button with a live count badge. Renders nothing where there is no
 *  cart (non-student areas), so it is safe to drop into the shared TopBar. */
export function CartButton({ className }: { className?: string }) {
  const cart = useContext(CartContext);
  if (!cart) return null;
  return (
    <Link
      href="/cart"
      aria-label={`Cart (${cart.count} item${cart.count === 1 ? '' : 's'})`}
      className={
        className ??
        'relative grid size-9 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy'
      }
    >
      <ShoppingCart className="size-[18px]" />
      {cart.count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-orange px-1 text-[10px] font-bold leading-4 text-[#171717]">
          {cart.count}
        </span>
      )}
    </Link>
  );
}
