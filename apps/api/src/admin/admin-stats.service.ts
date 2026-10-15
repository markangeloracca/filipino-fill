import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DB, type Db } from '../database/database.module.js';
import type { EstablishmentCategory } from '../database/database.types.js';

export interface PlatformStats {
  registeredUsers: number;
  pendingVerification: number;
  newUsersLast7Days: number;
  admins: number;
  establishments: number;
  filipinoOwned: number;
  comments: number;
  commentsLast7Days: number;
  byCategory: Array<{ category: EstablishmentCategory; count: number }>;
  topNeighbourhoods: Array<{ neighbourhood: string; count: number }>;
}

@Injectable()
export class AdminStatsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async stats(): Promise<PlatformStats> {
    const weekAgo = sql<Date>`now() - interval '7 days'`;

    const [users, establishments, comments, byCategory, topNeighbourhoods] = await Promise.all([
      this.db
        .selectFrom('profiles')
        .select((eb) => [
          eb.fn.count<number>('id').filterWhere('email_verified_at', 'is not', null).as('registered'),
          eb.fn.count<number>('id').filterWhere('email_verified_at', 'is', null).as('pending'),
          eb.fn.count<number>('id').filterWhere('email_verified_at', '>=', weekAgo).as('recent'),
          eb.fn.count<number>('id').filterWhere('role', 'in', ['admin', 'super_admin']).as('admins'),
        ])
        .executeTakeFirstOrThrow(),
      this.db
        .selectFrom('establishments')
        .select((eb) => [eb.fn.countAll<number>().as('total'), eb.fn.count<number>('id').filterWhere('is_filipino_owned', '=', true).as('owned')])
        .where('deleted_at', 'is', null)
        .executeTakeFirstOrThrow(),
      this.db
        .selectFrom('comments')
        .select((eb) => [eb.fn.countAll<number>().as('total'), eb.fn.count<number>('id').filterWhere('created_at', '>=', weekAgo).as('recent')])
        .where('deleted_at', 'is', null)
        .executeTakeFirstOrThrow(),
      this.db
        .selectFrom('establishments')
        .select((eb) => ['category', eb.fn.countAll<number>().as('count')])
        .where('deleted_at', 'is', null)
        .groupBy('category')
        .orderBy('count', 'desc')
        .execute(),
      this.db
        .selectFrom('establishments')
        .select((eb) => ['neighbourhood', eb.fn.countAll<number>().as('count')])
        .where('deleted_at', 'is', null)
        .groupBy('neighbourhood')
        .orderBy('count', 'desc')
        .limit(6)
        .execute(),
    ]);

    return {
      registeredUsers: users.registered,
      pendingVerification: users.pending,
      newUsersLast7Days: users.recent,
      admins: users.admins,
      establishments: establishments.total,
      filipinoOwned: establishments.owned,
      comments: comments.total,
      commentsLast7Days: comments.recent,
      byCategory,
      topNeighbourhoods,
    };
  }
}
