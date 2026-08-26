import { redirect } from 'next/navigation';

/**
 * Applications live as a TAB on the jobs page, not a page of their own.
 *
 * This route stays as a redirect rather than being deleted: it is linked from
 * confirmation emails, from the apply confirmation on a job page, and from anywhere a
 * student has already bookmarked it. Removing it would 404 all of those.
 */
export default function ApplicationsRedirect() {
  redirect('/jobs?tab=applied');
}
