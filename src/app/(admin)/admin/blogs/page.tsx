import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { BlogsManager } from '@/components/admin/BlogsManager';

export default function AdminBlogsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Blog' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Marketing</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Blog</h1>
        <p className="mt-1 text-sm text-slate-500">Author and publish posts shown on the public site.</p>
      </header>
      <BlogsManager />
    </div>
  );
}
