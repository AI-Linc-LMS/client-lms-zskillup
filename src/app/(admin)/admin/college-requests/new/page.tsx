'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
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
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-navy">New college registration request</h1>
        <p className="mt-1 text-sm text-slate-600">
          Save as a draft to finish later, or submit for Super Admin review.
        </p>
      </div>
      <CollegeRequestForm busy={busy} error={error} onSave={onSave} primaryLabel="Save & submit for review" />
    </div>
  );
}
