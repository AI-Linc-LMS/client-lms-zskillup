import {
  Building2,
  Code2,
  FileCheck2,
  FileText,
  Mic,
  MonitorPlay,
  Target,
  type LucideIcon,
} from 'lucide-react';
import type { FeatureLockModule } from '@/lib/api/feature-locks';

type Accent = 'orange' | 'violet' | 'sky' | 'emerald' | 'amber';

export interface ModuleMeta {
  module: FeatureLockModule;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: Accent;
}

/** Display metadata for each locked module, in the order the matrix renders them. */
export const MODULE_META: ModuleMeta[] = [
  {
    module: 'mock',
    label: 'Mock Assessments',
    description: 'Catalog mocks + scheduled drives',
    icon: FileCheck2,
    accent: 'orange',
  },
  {
    module: 'practice',
    label: 'Practice',
    description: 'Adaptive engine, as-wish practice, manual MCQ',
    icon: Target,
    accent: 'violet',
  },
  {
    module: 'coding',
    label: 'Coding',
    description: 'Judge0 coding problems',
    icon: Code2,
    accent: 'violet',
  },
  {
    module: 'company',
    label: 'Company Hubs',
    description: 'Company PYQ browsing (hub content also uses the modules above)',
    icon: Building2,
    accent: 'sky',
  },
  {
    module: 'mock_interview',
    label: 'Mock Interview',
    description: 'AI mock interview (career tool)',
    icon: Mic,
    accent: 'emerald',
  },
  {
    module: 'resume',
    label: 'Resume Builder',
    description: 'AI resume builder (career tool)',
    icon: FileText,
    accent: 'emerald',
  },
  {
    module: 'study_material',
    label: 'Study Material',
    description: 'Premium study-material library',
    icon: MonitorPlay,
    accent: 'amber',
  },
];

export const ACCENT_TILE: Record<Accent, string> = {
  orange: 'bg-orange-50 text-orange-600 ring-orange-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
};
