import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../database/database.module.js';
import type { ProfileRow } from '../database/database.types.js';

@Injectable()
export class ProfilesRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  findById(id: string, executor: Db = this.db): Promise<ProfileRow | undefined> {
    return executor.selectFrom('profiles').selectAll().where('id', '=', id).executeTakeFirst();
  }

  async updateDisplayName(id: string, displayName: string | null): Promise<ProfileRow> {
    return this.db
      .updateTable('profiles')
      .set({ display_name: displayName })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
