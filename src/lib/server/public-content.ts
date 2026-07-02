import type { BlogPostDto, TestimonialDto } from '@/shared/dto/content.dto';

/**
 * Server-side fetch of public marketing content (Phase 5). Used by the public
 * landing page (a server component). Never throws — returns [] on any failure so
 * the page can fall back to its built-in copy. Cached for 5 minutes.
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'http://zskillup-backend-alb-576289254.ap-south-1.elb.amazonaws.com';

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

export async function getPublicBlogs(): Promise<BlogPostDto[]> {
  return (await getJson<BlogPostDto[]>('/api/v1/content/blogs')) ?? [];
}

export async function getPublicBlog(slug: string): Promise<BlogPostDto | null> {
  return getJson<BlogPostDto>(`/api/v1/content/blogs/${encodeURIComponent(slug)}`);
}
