import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { DomainConflictException } from '../common/errors/domain.exceptions.js';
import { DB, type Db } from '../database/database.module.js';

export interface SetupStatus {
  superAdminExists: boolean;
}

@Injectable()
export class SetupService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async status(): Promise<SetupStatus> {
    const row = await this.db.selectFrom('profiles').select('id').where('role', '=', 'super_admin').limit(1).executeTakeFirst();
    return { superAdminExists: row !== undefined };
  }

  /**
   * First-run bootstrap: promotes the caller (already OTP-verified) to super admin
   * if, and only if, none exists. An advisory lock serialises concurrent claims and
   * the partial unique index `profiles_single_super_admin` is the final backstop.
   */
  async claimSuperAdmin(user: AuthenticatedUser): Promise<AuthenticatedUser> {
    return this.db.transaction().execute(async (trx) => {
      await sql`select pg_advisory_xact_lock(hashtext('filipino-fill:super-admin-setup'))`.execute(trx);

      const existing = await trx.selectFrom('profiles').select('id').where('role', '=', 'super_admin').limit(1).executeTakeFirst();
      if (existing) throw new DomainConflictException('Platform setup is already complete');

      await trx.updateTable('profiles').set({ role: 'super_admin' }).where('id', '=', user.id).execute();
      return { ...user, role: 'super_admin' as const };
    });
  }
}
