import { redirect } from 'next/navigation';

/** The course "prep tracks" catalog was retired — Prepare now points students to
 *  the company hubs (the real, content-backed prep path). */
export default function PreparePage() {
  redirect('/dashboard/company');
}
