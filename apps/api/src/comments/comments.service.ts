import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_ROLES, type AuthenticatedUser } from '../auth/auth.types.js';
import { EntityNotFoundException, ForbiddenActionException } from '../common/errors/domain.exceptions.js';
import { DB, type Db } from '../database/database.module.js';
import { EstablishmentsService } from '../establishments/establishments.service.js';

export interface CommentView {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; role: AuthenticatedUser['role'] };
}

const UUID = /^[0-9a-f-]{36}$/i;

/** Never expose another user's email: fall back to a masked handle. */
function publicName(displayName: string | null, email: string): string {
  if (displayName) return displayName;
  const local = email.split('@')[0] ?? 'kabayan';
  return `${local.slice(0, 2)}•••`;
}

@Injectable()
export class CommentsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly establishments: EstablishmentsService,
  ) {}

  async list(establishmentId: string, limit: number): Promise<CommentView[]> {
    await this.establishments.assertExists(establishmentId);
    // Single joined query: no per-comment author lookups.
    const rows = await this.db
      .selectFrom('comments as c')
      .innerJoin('profiles as p', 'p.id', 'c.user_id')
      .select(['c.id', 'c.body', 'c.created_at', 'p.id as author_id', 'p.display_name', 'p.email', 'p.role'])
      .where('c.establishment_id', '=', establishmentId)
      .where('c.deleted_at', 'is', null)
      .orderBy('c.created_at', 'desc')
      .limit(limit)
      .execute();

    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at.toISOString(),
      author: { id: r.author_id, name: publicName(r.display_name, r.email), role: r.role },
    }));
  }

  async create(establishmentId: string, user: AuthenticatedUser, body: string): Promise<CommentView> {
    await this.establishments.assertExists(establishmentId);
    const row = await this.db
      .insertInto('comments')
      .values({ establishment_id: establishmentId, user_id: user.id, body })
      .returning(['id', 'body', 'created_at'])
      .executeTakeFirstOrThrow();

    return {
      id: row.id,
      body: row.body,
      createdAt: row.created_at.toISOString(),
      author: { id: user.id, name: publicName(user.displayName, user.email), role: user.role },
    };
  }

  /** Authors can delete their own comments; admins can moderate any. Soft delete. */
  async remove(commentId: string, user: AuthenticatedUser): Promise<void> {
    if (!UUID.test(commentId)) throw new EntityNotFoundException('Comment', commentId);
    const comment = await this.db
      .selectFrom('comments')
      .select(['id', 'user_id'])
      .where('id', '=', commentId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!comment) throw new EntityNotFoundException('Comment', commentId);
    if (comment.user_id !== user.id && !ADMIN_ROLES.includes(user.role)) {
      throw new ForbiddenActionException('You can only delete your own comments');
    }
    await this.db.updateTable('comments').set({ deleted_at: new Date() }).where('id', '=', commentId).execute();
  }
}
