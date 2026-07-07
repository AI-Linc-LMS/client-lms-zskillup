import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/layout/BrandLogo';

/**
 * Global 404 (Implementation Plan §5). Zone-C light surface, brand wordmark,
 * and two clear ways back. Rendered for any unmatched route.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <BrandLogo variant="dark" className="h-7" />
      <span className="mt-10 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Error 404
      </span>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
        We couldn&apos;t find that page.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
        The page you&apos;re looking for doesn&apos;t exist or may have moved. Let&apos;s get you
        back to your prep.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/company">Browse the catalog</Link>
        </Button>
      </div>
    </main>
  );
}
