import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { Newspaper } from 'lucide-react';
import { BlogsManager } from '@/components/admin/BlogsManager';

export default function AdminBlogsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Blog' }]} />
      <ConsoleHero
        icon={Newspaper}
        eyebrow="Platform Admin"
        title="Blog"
        description="Author and publish posts shown on the public site."
      />
      <BlogsManager />
    </div>
  );
}
