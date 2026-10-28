import { PromoBannerSlot } from '@/components/promo/PromoBannerSlot';

/**
 * Community is a client component, and a server component cannot be rendered inside one.
 * Putting the slot in this layout keeps ONE PromoBannerSlot implementation instead of a
 * second client-fetching variant that would flash in after paint.
 */
export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PromoBannerSlot placement="COMMUNITY" />
      {children}
    </div>
  );
}
