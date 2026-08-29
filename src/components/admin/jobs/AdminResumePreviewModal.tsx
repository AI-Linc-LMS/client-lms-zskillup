'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { getApplicantResume } from '@/lib/api/jobs';
import { ResumePreview } from '@/components/resume/ResumePreview';
import { resumeToPdfBlob, downloadBlob } from '@/components/resume/pdf';
import type { ResumeData, TemplateKey } from '@/components/resume/types';

/**
 * An applicant's BUILT (Resume Builder) resume, rendered for a recruiter with the same
 * template engine the student built it in, plus a real PDF export. Lazy-loaded from the
 * applicants screen so the resume template bundle never weighs down the list itself.
 */
export function AdminResumePreviewModal({
  applicationId,
  applicantName,
  onClose,
}: {
  applicationId: string;
  applicantName: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<
    'loading' | 'error' | 'empty' | { title: string; template: string; data: Record<string, unknown> }
  >('loading');
  const [downloading, setDownloading] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    getApplicantResume(applicationId)
      .then((r) => alive && setState(r ?? 'empty'))
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [applicationId]);

  const resume = typeof state === 'object' ? state : null;

  const download = async () => {
    if (!pageRef.current) return;
    setDownloading(true);
    try {
      const blob = await resumeToPdfBlob(pageRef.current);
      downloadBlob(blob, `${applicantName.trim().replace(/\s+/g, '_') || 'applicant'}_Resume.pdf`);
    } catch {
      toast.error('Could not build the PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal open onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Built resume
          </p>
          <h2 className="mt-1 text-lg font-bold text-navy">{applicantName}</h2>
        </div>
        {resume ? (
          <Button size="sm" onClick={download} disabled={downloading}>
            {downloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}{' '}
            Download PDF
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid max-h-[70vh] place-items-center overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-4">
        {state === 'loading' ? (
          <div className="py-16">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : resume ? (
          <ResumePreview
            ref={pageRef}
            data={resume.data as unknown as ResumeData}
            templateKey={resume.template as TemplateKey}
          />
        ) : state === 'empty' ? (
          <p className="py-16 text-center text-sm text-slate-500">
            This applicant applied with an uploaded or hosted resume, not a built one.
          </p>
        ) : (
          <p className="py-16 text-center text-sm text-slate-500">Could not load the resume.</p>
        )}
      </div>
    </Modal>
  );
}
