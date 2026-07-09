import {
  BadgePercent,
  BarChart3,
  Building2,
  CalendarCheck,
  ClipboardList,
  Code2,
  ListChecks,
  MessageSquare,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';

/** Shared marketing content for the plan surfaces (Explore Plans + Upgrade & Renew). */

export const PLATFORM_FEATURES = [
  'All Companies & Company Hubs',
  'All Sections & Sub-topics',
  'Unlimited Practice & Mocks',
  'Coding Arena + Interview Prep',
  'Performance Analytics',
  'All Upcoming Updates',
];

export const CUSTOM_FEATURES = [
  'Choose specific Companies',
  'Choose Sections',
  'Choose Sub-topics / Topics',
  'Set validity per item',
  'Pay only for what you add',
];

export const PLAN_STATS = [
  { icon: Building2, value: '100+', label: 'Companies & hubs', tint: 'bg-violet-50 text-violet-600' },
  { icon: ListChecks, value: '55,000+', label: 'Practice questions', tint: 'bg-indigo-50 text-indigo-600' },
  { icon: ClipboardList, value: 'Unlimited', label: 'Mock tests', tint: 'bg-amber-50 text-amber-600' },
  { icon: Sparkles, value: 'AI', label: 'Career tools', tint: 'bg-emerald-50 text-emerald-600' },
];

export const PLAN_INCLUDED = [
  { icon: Building2, title: 'Company PYQ banks', desc: 'Real previous-year questions, pattern-matched by recruiter.' },
  { icon: Target, title: 'Adaptive practice', desc: 'Difficulty that tunes to you, section by section.' },
  { icon: ClipboardList, title: 'Full-length mocks', desc: 'Timed, exam-style simulations with detailed reports.' },
  { icon: BarChart3, title: 'Performance analytics', desc: 'Track readiness, accuracy and weak spots over time.' },
  { icon: Trophy, title: 'All-India leaderboards', desc: 'See where you stand against your cohort and beyond.' },
  { icon: CalendarCheck, title: 'Personalized study plan', desc: 'A day-by-day roadmap generated from your calibration.' },
];

export const PLAN_VALUES = [
  { icon: BadgePercent, title: 'Save more', desc: 'Up to 37% off with longer access plans.', tint: 'bg-emerald-50 text-emerald-600' },
  { icon: Code2, title: 'Coding + interviews', desc: 'Judge0 coding arena and AI mock interviews included.', tint: 'bg-indigo-50 text-indigo-600' },
  { icon: MessageSquare, title: 'Prep that adapts', desc: 'Everything personalizes to your target roles and gaps.', tint: 'bg-amber-50 text-amber-600' },
];

export const PLAN_FAQ = [
  {
    q: 'What’s the difference between the two plans?',
    a: 'Full Platform Access unlocks everything on Prephasz in one plan. Build Your Own lets you pick only the companies, sections or topics you need — and pay only for those.',
  },
  {
    q: 'Can I upgrade from a custom plan to Full Platform later?',
    a: 'Yes. You can upgrade any time from the cart or Upgrade & Renew — Full Platform supersedes your granular purchases so nothing is wasted.',
  },
  {
    q: 'Are Mock Interview & Resume Builder included?',
    a: 'They come bundled with any Company hub or the Full Platform plan. There’s no way to buy them standalone.',
  },
  {
    q: 'Which payment methods do you accept?',
    a: 'All major cards, UPI, RuPay and net-banking via Razorpay — 256-bit SSL encrypted. GST invoices are available on request.',
  },
];
