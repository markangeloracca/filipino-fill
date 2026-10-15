import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { sql } from 'kysely';
import { DB, type Db } from '../database/database.module.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await sql`select 1`.execute(this.db);
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Database unreachable');
    }
  }
}
