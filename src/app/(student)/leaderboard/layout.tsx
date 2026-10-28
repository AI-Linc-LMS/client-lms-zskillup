import { PromoBannerSlot } from '@/components/promo/PromoBannerSlot';

/**
 * Leaderboard is a client component, and a server component cannot be rendered inside one.
 * Putting the slot in this layout keeps ONE PromoBannerSlot implementation instead of a
 * second client-fetching variant that would flash in after paint.
 */
export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PromoBannerSlot placement="LEADERBOARD" />
      {children}
    </div>
  );
}
