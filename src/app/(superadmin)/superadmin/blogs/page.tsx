import { Newspaper } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { BlogsManager } from '@/components/admin/BlogsManager';

export default function SuperadminBlogsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Super Admin', href: '/superadmin/dashboard' }, { label: 'Blog' }]} />
      <ConsoleHero
        icon={Newspaper}
        eyebrow="Super Admin"
        title="Blog"
        description="Author and publish posts shown on the public site."
      />
      <BlogsManager />
    </div>
  );
}
