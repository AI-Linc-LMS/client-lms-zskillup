'use client';

import { AlertTriangle, Lightbulb } from 'lucide-react';
import type { NarrationMisconceptions } from '@/lib/api/adaptive';

interface MisconceptionCalloutProps {
  misconceptions: NarrationMisconceptions['misconceptions'];
}

export function MisconceptionCallout({ misconceptions }: MisconceptionCalloutProps) {
  if (misconceptions.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
        No recurring misconceptions detected. Great work!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {misconceptions.map((m, i) => (
        <div key={i} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800 text-sm">{m.title}</p>
              <p className="mt-1 text-xs text-amber-700">
                Evidence: Q{m.evidence_question_indices.join(', Q')}
              </p>
              <p className="mt-2 text-sm text-amber-900">{m.explanation}</p>
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/60 p-3">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">{m.fix}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
