'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { Building2 } from 'lucide-react';
import {
  CollegeRequestForm,
  toCreateBody,
  type CollegeRequestFormValue,
} from '@/components/admin/CollegeRequestForm';
import { createCollegeRequest, submitCollegeRequest } from '@/lib/api/college-requests';

export default function NewCollegeRequestPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(value: CollegeRequestFormValue, mode: 'draft' | 'submit') {
    setBusy(true);
    setError(null);
    try {
      const created = await createCollegeRequest(toCreateBody(value));
      if (mode === 'submit') await submitCollegeRequest(created.id);
      router.push(`/admin/college-requests/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the request');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'College Requests', href: '/admin/college-requests' },
          { label: 'New' },
        ]}
      />
      <ConsoleHero
        icon={Building2}
        eyebrow="Platform Admin"
        title="New college registration request"
        description="Save as a draft to finish later, or submit for Super Admin review."
      />
      <CollegeRequestForm busy={busy} error={error} onSave={onSave} primaryLabel="Save & submit for review" />
    </div>
  );
}
