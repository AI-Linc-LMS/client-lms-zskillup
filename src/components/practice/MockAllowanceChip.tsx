'use client';

import { Brain, Crown } from 'lucide-react';
import { useMySubscription } from '@/hooks/useMySubscription';

/**
 * Honest, plan-aware "how many mocks you get" chip for the Mock Assessment hero.
 * Free users receive ONE complimentary mock then hit the upgrade modal (enforced
 * server-side by mockAssessmentAccess), so promising "unlimited attempts" to
 * everyone was misleading - premium keeps unlimited, free sees the real allowance.
 */
export function MockAllowanceChip() {
  const { planStatus } = useMySubscription(true);
  const isPremium = planStatus !== 'none';
  const Icon = isPremium ? Brain : Crown;
  const text = isPremium ? 'Unlimited attempts' : '1 free mock, then upgrade';
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
      <Icon className="size-4 text-white/40" /> {text}
    </div>
  );
}
