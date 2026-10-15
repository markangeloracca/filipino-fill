import { Global, Inject, Injectable, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Env } from '../config/env.js';
import type { Database } from './database.types.js';

export const DB = Symbol('DB');
export type Db = Kysely<Database>;

// Return BIGINT counts as JS numbers; all our counts fit comfortably.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number.parseInt(value, 10));

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  private readonly logger = new Logger('Database');

  constructor(@Inject(DB) private readonly db: Db) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Closing database pool${signal ? ` (${signal})` : ''}`);
    await this.db.destroy();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): Db => {
        const pool = new pg.Pool({
          connectionString: config.get('DATABASE_URL', { infer: true }),
          max: config.get('DB_POOL_MAX', { infer: true }),
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        });
        // Idle clients can be terminated by the server (restart, failover). Without a
        // listener, pg re-throws this as an uncaught error and crashes the process;
        // the pool discards the dead client and reconnects on the next query.
        pool.on('error', (err) => new Logger('Database').warn(`Idle client error: ${err.message}`));
        return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
      },
    },
    DatabaseLifecycle,
  ],
  exports: [DB],
})
export class DatabaseModule {}
