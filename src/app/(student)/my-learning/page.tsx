import { redirect } from 'next/navigation';

/** "My Learning" (the course catalog) was retired - redirect to the dashboard. */
export default function MyLearningPage() {
  redirect('/dashboard');
}
