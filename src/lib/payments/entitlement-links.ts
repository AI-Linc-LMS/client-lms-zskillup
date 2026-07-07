import { EntitlementScope } from '@/shared/enums';

/**
 * Where a purchased entitlement lets the student go to actually use it. Topics
 * open the adaptive runner pinned to that topic; companies open their hub; coding
 * topics open the coding workspace; sections/platform open the practice picker.
 */
export function practiceLinkForEntitlement(
  scopeType: EntitlementScope,
  scopeRef: string | null,
): { href: string; cta: string } {
  switch (scopeType) {
    case EntitlementScope.COMPANY:
      return { href: `/dashboard/company/${scopeRef ?? ''}`, cta: 'Open hub' };
    case EntitlementScope.TOPIC:
      if (scopeRef?.startsWith('coding:')) return { href: '/coding', cta: 'Start coding' };
      return {
        href: `/dashboard/quiz/adaptive?topic=${encodeURIComponent(scopeRef ?? '')}`,
        cta: 'Start practice',
      };
    case EntitlementScope.SECTION:
    case EntitlementScope.PLATFORM:
    default:
      return { href: '/practice', cta: 'Practice' };
  }
}

/** Readable label for an entitlement scope + ref (e.g. "Topic: Profit Loss"). */
export function entitlementLabel(scopeType: EntitlementScope, scopeRef: string | null): string {
  if (scopeType === EntitlementScope.PLATFORM) return 'Full platform';
  const pretty = (scopeRef ?? '')
    .replace(/^coding:/, '')
    .split(/[-:]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const noun = scopeType.charAt(0) + scopeType.slice(1).toLowerCase();
  return pretty ? `${noun}: ${pretty}` : noun;
}
