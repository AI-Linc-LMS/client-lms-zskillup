/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Help assistant (student chatbot). The client sends the running conversation; the
 * server prepends a platform-knowledge system prompt and returns the next reply.
 * Stateless — no history is persisted. Frontend imports these with `import type`.
 */
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export type AssistantRole = 'user' | 'assistant';

export class AssistantMessageDto {
  @IsIn(['user', 'assistant'])
  role!: AssistantRole;

  @IsString()
  @MaxLength(4000)
  content!: string;
}

/** One turn of the help chat: the whole visible conversation (oldest → newest). */
export class AssistantChatDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => AssistantMessageDto)
  messages!: AssistantMessageDto[];
}

export interface AssistantReplyDto {
  reply: string;
}
