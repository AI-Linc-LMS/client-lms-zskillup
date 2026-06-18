'use client';

import Link from 'next/link';
import { BookOpen, Dumbbell, Play, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NarrationRemediationPath } from '@/lib/api/adaptive';

const ACTION_CONFIG = {
  practice: { icon: Dumbbell, label: 'Practice', color: 'text-orange bg-orange/10 border-orange/20' },
  read: { icon: BookOpen, label: 'Read', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  watch: { icon: Play, label: 'Watch', color: 'text-purple-600 bg-purple-50 border-purple-200' },
} as const;

interface RemediationPathProps {
  steps: NarrationRemediationPath['remediation_path'];
}

export function RemediationPath({ steps }: RemediationPathProps) {
  if (steps.length === 0) return null;

  return (
    <div className="space-y-4">
      {steps.map((step) => {
        const cfg = ACTION_CONFIG[step.action_kind] ?? ACTION_CONFIG.practice;
        const Icon = cfg.icon;
        return (
          <div
            key={step.step}
            className="flex gap-4 rounded-xl border bg-white p-4 shadow-sm"
          >
            <div className="flex shrink-0 flex-col items-center gap-1">
              <span className="flex size-8 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                {step.step}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-navy text-sm">{step.title}</p>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                      cfg.color,
                    )}
                  >
                    <Icon className="size-3" />
                    {cfg.label}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="size-3" />
                    ~{step.est_minutes} min
                  </span>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{step.why}</p>
              <p className="mt-1 text-xs text-orange font-medium">Focus: {step.target_skill}</p>
              <div className="mt-3">
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/practice">Start practice</Link>
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
