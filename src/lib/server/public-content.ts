import type { BlogPostDto, TestimonialDto } from '@/shared/dto/content.dto';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';

/**
 * Server-side fetch of public marketing content (Phase 5). Used by the public
 * landing page (a server component). Never throws - returns [] on any failure so
 * the page can fall back to its built-in copy. Cached for 5 minutes.
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'http://zskillup-load-balancer-122235018.ap-south-1.elb.amazonaws.com';

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: T } | T;
    // The API wraps payloads as { data, meta }; tolerate both shapes.
    return (body as { data?: T }).data ?? (body as T);
  } catch {
    return null;
  }
}

export async function getPublicTestimonials(): Promise<TestimonialDto[]> {
  return (await getJson<TestimonialDto[]>('/api/v1/content/testimonials')) ?? [];
}

/** Published testimonials an admin opted in to the public job pages. */
export async function getPublicJobTestimonials(): Promise<TestimonialDto[]> {
  return (await getJson<TestimonialDto[]>('/api/v1/content/testimonials/jobs')) ?? [];
}

/** Published blog posts an admin opted in to the public job pages ("Related reading"). */
export async function getPublicJobBlogs(): Promise<BlogPostDto[]> {
  return (await getJson<BlogPostDto[]>('/api/v1/content/blogs/jobs')) ?? [];
}

export async function getPublicBlogs(): Promise<BlogPostDto[]> {
  return (await getJson<BlogPostDto[]>('/api/v1/content/blogs')) ?? [];
}

export async function getPublicBlog(slug: string): Promise<BlogPostDto | null> {
  return getJson<BlogPostDto>(`/api/v1/content/blogs/${encodeURIComponent(slug)}`);
}

/** Published job openings, newest first. Public - a logged-out visitor arriving from a
 *  shared link or a search result must be able to read the board. */
export async function getPublicJobs(): Promise<JobPostingDto[]> {
  // GET /api/v1/jobs returns a paginated { items, total } envelope, NOT a bare array.
  // Reaching for `.map` on the envelope threw `e.map is not a function` while
  // prerendering /sitemap.xml — but ONLY on a build where the backend is reachable
  // (Netlify), never locally (where the fetch fails and we fall back to []). That one
  // shape mismatch froze every production FE deploy from 2026-08-25 to 08-26. Pull
  // `items` (and tolerate any future shape drift) so the sitemap can never crash the build.
  const page = await getJson<{ items?: JobPostingDto[] }>('/api/v1/jobs');
  return Array.isArray(page?.items) ? page.items : [];
}

/** One job by its shareable slug. Null when it does not exist or is still a draft. */
export async function getPublicJob(slug: string): Promise<JobPostingDto | null> {
  return getJson<JobPostingDto>(`/api/v1/jobs/${encodeURIComponent(slug)}`);
}
