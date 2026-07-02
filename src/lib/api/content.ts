import { apiClient } from './client';
import type {
  BlogPostDto,
  CreateBlogPostDto,
  CreateTestimonialDto,
  TestimonialDto,
  UpdateBlogPostDto,
  UpdateTestimonialDto,
} from '@/shared/dto/content.dto';

/**
 * Content CMS API client (Phase 5). Admin routes (/api/v1/admin/blogs|testimonials)
 * are gated @Roles(ADMIN, SUPER_ADMIN); the /content/* reads are public.
 */

// ── Admin: blogs ─────────────────────────────────────────────────────────────
export async function listAdminBlogs(): Promise<BlogPostDto[]> {
  return (await apiClient.get<BlogPostDto[]>('/api/v1/admin/blogs')).data;
}
export async function createBlog(dto: CreateBlogPostDto): Promise<BlogPostDto> {
  return (await apiClient.post<BlogPostDto>('/api/v1/admin/blogs', dto)).data;
}
export async function updateBlog(id: string, dto: UpdateBlogPostDto): Promise<BlogPostDto> {
  return (await apiClient.patch<BlogPostDto>(`/api/v1/admin/blogs/${id}`, dto)).data;
}
export async function deleteBlog(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/blogs/${id}`);
}

// ── Admin: testimonials ──────────────────────────────────────────────────────
export async function listAdminTestimonials(): Promise<TestimonialDto[]> {
  return (await apiClient.get<TestimonialDto[]>('/api/v1/admin/testimonials')).data;
}
export async function createTestimonial(dto: CreateTestimonialDto): Promise<TestimonialDto> {
  return (await apiClient.post<TestimonialDto>('/api/v1/admin/testimonials', dto)).data;
}
export async function updateTestimonial(
  id: string,
  dto: UpdateTestimonialDto,
): Promise<TestimonialDto> {
  return (await apiClient.patch<TestimonialDto>(`/api/v1/admin/testimonials/${id}`, dto)).data;
}
export async function deleteTestimonial(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/testimonials/${id}`);
}

// ── Public reads (no auth) ───────────────────────────────────────────────────
export async function getPublishedTestimonials(): Promise<TestimonialDto[]> {
  return (await apiClient.get<TestimonialDto[]>('/api/v1/content/testimonials', { auth: 'public' }))
    .data;
}
export async function getPublishedBlogs(): Promise<BlogPostDto[]> {
  return (await apiClient.get<BlogPostDto[]>('/api/v1/content/blogs', { auth: 'public' })).data;
}
export async function getPublishedBlog(slug: string): Promise<BlogPostDto> {
  return (
    await apiClient.get<BlogPostDto>(`/api/v1/content/blogs/${slug}`, { auth: 'public' })
  ).data;
}
