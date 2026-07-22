import { redirect } from 'next/navigation';

/**
 * Company + topic practice now runs through the unified adaptive Practice engine
 * (Mode 1) - this route just forwards to it, scoped to the topic + company.
 */
export default async function CompanyTopicPracticePage({
  params,
}: {
  params: Promise<{ slug: string; topicSlug: string }>;
}) {
  const { slug, topicSlug } = await params;
  redirect(
    `/dashboard/quiz/adaptive?topic=${encodeURIComponent(topicSlug)}&company=${encodeURIComponent(slug)}`,
  );
}
