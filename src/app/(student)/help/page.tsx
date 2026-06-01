import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MessageCircle, Mail, Users, ExternalLink } from 'lucide-react';

const faqs = [
  {
    question: 'How is my PPS score calculated?',
    answer:
      'Your Placement Preparedness Score is computed by the backend from your assessment results, course progress, mock test performance, and activity streaks. The score is always fetched from the server â€” it is never estimated on the client.',
  },
  {
    question: 'Can I change my target companies after onboarding?',
    answer:
      'Yes. Visit your profile settings and navigate to "Target Companies" to update your selections at any time. Your roadmap and recommended materials will adjust accordingly.',
  },
  {
    question: 'How do mock test scores affect PPS?',
    answer:
      'Full Mock Assessment scores carry significant weight in PPS calculations. Each completed mock is evaluated against national benchmark data, and your percentile and weak-topic signals are factored into your PPS by the backend.',
  },
  {
    question: 'What is the difference between Practice Quiz and Full Mock?',
    answer:
      'Practice Quizzes are low-pressure, untimed sets with instant feedback â€” ideal for learning. Full Mock Assessments are timed, competitive, and simulate real placement test conditions. Both are available within each Company Hub.',
  },
  {
    question: 'How do I earn badges?',
    answer:
      'Badges are awarded automatically by the backend when you hit defined milestones â€” completing a course, achieving a streak, scoring above a threshold in a mock, or finishing a daily quest. You will receive an in-app notification when a badge is unlocked.',
  },
  {
    question: 'Is my data shared with placement cells?',
    answer:
      'Aggregate, anonymised performance data is shared with your college placement cell as permitted by your institution agreement. Individually identifiable data is never shared with third parties without your explicit consent. See the Privacy Policy for full details.',
  },
];

const quickLinks = [
  { label: 'Knowledge Base', href: '/knowledge-base' },
  { label: 'Roadmap', href: '/roadmap' },
  { label: 'Leaderboard', href: '/leaderboard' },
];

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Help & Support' },
        ]}
      />

      {/* Header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Support
        </p>
        <h1 className="font-bold text-navy text-2xl">Help & Support</h1>
        <p className="text-sm text-slate-600 mt-1">We&apos;re here to help</p>
      </div>

      {/* Support channels */}
      <section aria-labelledby="support-channels-heading">
        <h2 id="support-channels-heading" className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
          Contact Us
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Live Chat */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange/10">
                <MessageCircle className="h-5 w-5 text-orange" aria-hidden="true" />
              </span>
              <span className="font-bold text-navy text-sm">Live Chat</span>
            </div>
            <p className="text-sm text-slate-600">Available Monâ€“Sat, 9 AM â€“ 8 PM IST</p>
            <button
              type="button"
              className="mt-auto rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 self-start"
            >
              Start chat
            </button>
          </div>

          {/* Email Support */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50">
                <Mail className="h-5 w-5 text-sky-600" aria-hidden="true" />
              </span>
              <span className="font-bold text-navy text-sm">Email Support</span>
            </div>
            <p className="text-sm text-slate-600">
              support@zskillup.dev â€” Response within 24 hrs
            </p>
            <Link
              href="mailto:support@zskillup.dev"
              className="mt-auto rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 self-start"
            >
              Send email
            </Link>
          </div>

          {/* Community */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <Users className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              </span>
              <span className="font-bold text-navy text-sm">Community</span>
            </div>
            <p className="text-sm text-slate-600">Ask peers and mentors in the Discord</p>
            <Link
              href="https://discord.gg/zskillup"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 self-start"
            >
              Join community
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
          Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="rounded-xl border border-slate-200 bg-white shadow-sm p-5"
            >
              <p className="font-bold text-navy text-sm mb-2">{faq.question}</p>
              <p className="text-sm text-slate-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section aria-labelledby="quick-links-heading">
        <h2 id="quick-links-heading" className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
          Quick Links
        </h2>
        <div className="flex flex-wrap gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
            >
              {link.label}
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}