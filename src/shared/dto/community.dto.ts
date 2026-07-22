/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Community / discussion forum (smaller than AI-LINC): posts of a few kinds,
 * one level of threaded comments, and likes. The frontend imports the request
 * classes with `import type` (validation runs server-side only) and the response
 * interfaces for typing its API client.
 */
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CommunityPostType } from '../enums';

// ── Requests ────────────────────────────────────────────────────────────────

export class CreateCommunityPostDto {
  @IsOptional()
  @IsEnum(CommunityPostType)
  type?: CommunityPostType;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkUrl?: string | null;
}

export class UpdateCommunityPostDto {
  @IsOptional()
  @IsEnum(CommunityPostType)
  type?: CommunityPostType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkUrl?: string | null;
}

export class CreateCommunityCommentDto {
  @IsString()
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

// ── Responses ───────────────────────────────────────────────────────────────

export interface CommunityAuthorDto {
  id: string;
  name: string;
  avatarUrl: string | null;
  collegeName: string | null;
  role: string;
}

export interface CommunityPostDto {
  id: string;
  type: CommunityPostType;
  title: string;
  body: string;
  tags: string[];
  linkUrl: string | null;
  isPinned: boolean;
  author: CommunityAuthorDto;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  isMine: boolean;
  canModerate: boolean;
  canPin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityCommentDto {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  author: CommunityAuthorDto;
  likeCount: number;
  likedByMe: boolean;
  isMine: boolean;
  canModerate: boolean;
  createdAt: string;
  replies: CommunityCommentDto[];
}

export interface CommunityPostDetailDto extends CommunityPostDto {
  comments: CommunityCommentDto[];
}

export interface CommunityPostListDto {
  posts: CommunityPostDto[];
  total: number;
}

export interface CommunityLikeToggleDto {
  liked: boolean;
  likeCount: number;
}

export interface CommunityStatsDto {
  totalPosts: number;
  totalComments: number;
  totalMembers: number;
  topTags: Array<{ tag: string; count: number }>;
}
