import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { CommentsService, type CommentView } from './comments.service.js';

class CreateCommentDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}

class ListCommentsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;
}

@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('establishments/:id/comments')
  list(@Param('id') establishmentId: string, @Query() query: ListCommentsQuery): Promise<CommentView[]> {
    return this.comments.list(establishmentId, query.limit);
  }

  /** Only registered (email-verified) users may comment — enforced by AuthGuard. */
  @Post('establishments/:id/comments')
  @UseGuards(AuthGuard)
  create(@Param('id') establishmentId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCommentDto): Promise<CommentView> {
    return this.comments.create(establishmentId, user, dto.body);
  }

  @Delete('comments/:id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.comments.remove(id, user);
  }
}
