'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Crown, Layers, ShoppingCart } from 'lucide-react';
import { getMe } from '@/lib/api/me';
import { EntitlementScope } from '@/shared/enums';
import type { BillingPeriod } from '@/shared/enums';

/** One line the student has added to their cart (pre-checkout, client-side). The
 *  amount is always (re)priced server-side at checkout - we keep only what to buy. */
export interface CartItem {
  scope: EntitlementScope;
  scopeRef: string | null;
  period: BillingPeriod;
  /** Human label for the cart list, e.g. "Profit & Loss" or "TCS". */
  label: string;
  /** For a TOPIC (sub-section): its parent SECTION slug. Lets the cart detect when a
   *  whole section already covers (or would replace) individual sub-topics. */
  sectionRef?: string | null;
}

export const cartKey = (i: Pick<CartItem, 'scope' | 'scopeRef' | 'period'>): string =>
  `${i.scope}:${i.scopeRef ?? ''}:${i.period}`;

/**
 * A cart-composition conflict surfaced as a popup before the item is added:
 * - `platform-only`     adding Full Platform, which must be the ONLY line → replace all.
 * - `platform-present`  adding anything while Full Platform is in the cart → it already covers it.
 * - `section-covers`    adding a sub-topic already covered by a whole section in the cart.
 * - `section-replaces`  adding a section that covers sub-topics already in the cart → replace them.
 */
export type CartConflict =
  | { kind: 'platform-only'; pending: CartItem }
  | { kind: 'platform-present'; pending: CartItem }
  | { kind: 'section-covers'; pending: CartItem; section: CartItem }
  | { kind: 'section-replaces'; pending: CartItem; topics: CartItem[] };

/** Pure rule check: does adding `item` to `items` create a composition conflict? */
function detectConflict(items: CartItem[], item: CartItem): CartConflict | null {
  const platform = items.find((i) => i.scope === EntitlementScope.PLATFORM);
  if (item.scope === EntitlementScope.PLATFORM) {
    // Full Platform includes everything, so it must be the only thing in the cart.
    const others = items.filter((i) => i.scope !== EntitlementScope.PLATFORM);
    return others.length > 0 ? { kind: 'platform-only', pending: item } : null;
  }
  // Adding a granular item while Full Platform is already selected: it's redundant.
  if (platform) return { kind: 'platform-present', pending: item };
  // Sub-topic already covered by a whole section in the cart.
  if (item.scope === EntitlementScope.TOPIC && item.sectionRef) {
    const section = items.find(
      (i) => i.scope === EntitlementScope.SECTION && i.scopeRef === item.sectionRef,
    );
    if (section) return { kind: 'section-covers', pending: item, section };
  }
  // Section that covers sub-topics already in the cart.
  if (item.scope === EntitlementScope.SECTION) {
    const topics = items.filter(
      (i) => i.scope === EntitlementScope.TOPIC && i.sectionRef === item.scopeRef,
    );
    if (topics.length > 0) return { kind: 'section-replaces', pending: item, topics };
  }
  return null;
}

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
 * to the BROWSER, not the account - so signing out and into a second account on the
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
    // user's cart - we can't know which account it belonged to, and adopting it
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
        // Signed out / not a student - start empty. Never inherit another account's cart.
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
      /* quota / private mode - cart just won't persist */
    }
  }, [items, hydrated, userId]);

  const [conflict, setConflict] = useState<CartConflict | null>(null);

  const add = useCallback(
    (item: CartItem) => {
      // Exact duplicate (same scope+ref+period) is a silent no-op, as before.
      if (items.some((p) => cartKey(p) === cartKey(item))) return;
      const c = detectConflict(items, item);
      if (c) {
        setConflict(c);
        return;
      }
      setItems((prev) => (prev.some((p) => cartKey(p) === cartKey(item)) ? prev : [...prev, item]));
    },
    [items],
  );
  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((p) => cartKey(p) !== key));
  }, []);
  const clear = useCallback(() => setItems([]), []);

  // Resolve the pending conflict: 'replace' commits the destructive fix (swap the
  // cart for the pending item), else the popup just dismisses (nothing added).
  const resolveConflict = useCallback(() => {
    setConflict((c) => {
      if (!c) return null;
      if (c.kind === 'platform-only') {
        setItems([c.pending]); // Full Platform becomes the whole cart
      } else if (c.kind === 'section-replaces') {
        const drop = new Set(c.topics.map((t) => cartKey(t)));
        setItems((prev) => [...prev.filter((p) => !drop.has(cartKey(p))), c.pending]);
      }
      // 'platform-present' / 'section-covers' are informational blocks - add nothing.
      return null;
    });
  }, []);
  const dismissConflict = useCallback(() => setConflict(null), []);
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

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartConflictModal conflict={conflict} onReplace={resolveConflict} onDismiss={dismissConflict} />
    </CartContext.Provider>
  );
}

/** Popup shown when an Add would create a duplicate/redundant cart (items 22 + 23). */
function CartConflictModal({
  conflict,
  onReplace,
  onDismiss,
}: {
  conflict: CartConflict | null;
  onReplace: () => void;
  onDismiss: () => void;
}) {
  if (!conflict) return null;

  const isPlatform = conflict.kind === 'platform-only' || conflict.kind === 'platform-present';
  const canReplace = conflict.kind === 'platform-only' || conflict.kind === 'section-replaces';

  const title = isPlatform ? 'Full Platform Already Selected' : 'Duplicate Content Selected';
  const Icon = isPlatform ? Crown : Layers;

  let body: string;
  switch (conflict.kind) {
    case 'platform-only':
      body =
        'Full Platform Access already includes every company, section and sub-topic. Your cart can only contain Full Platform - replace your other selections with it?';
      break;
    case 'platform-present':
      body = `Full Platform Access is already in your cart and includes "${conflict.pending.label}". There's nothing more to add.`;
      break;
    case 'section-covers':
      body = `The section "${conflict.section.label}" is already in your cart and includes "${conflict.pending.label}". You don't need to add it separately.`;
      break;
    case 'section-replaces':
      body = `"${conflict.pending.label}" includes ${conflict.topics.length} sub-topic${conflict.topics.length === 1 ? '' : 's'} already in your cart. Replace ${conflict.topics.length === 1 ? 'it' : 'them'} with the whole section?`;
      break;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[120] grid place-items-center bg-slate-900/40 p-4"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-base font-bold text-navy">
              <Icon className="size-4 text-slate-400" /> {title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {canReplace ? 'Keep current' : 'Got it'}
          </button>
          {canReplace ? (
            <button
              type="button"
              onClick={onReplace}
              className="rounded-full bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy/90"
            >
              Replace
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}

/** Null-safe cart access - returns null outside a CartProvider (e.g. admin/TPO
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
        'relative grid size-9 place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-navy'
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
