import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CommentsModule } from './comments/comments.module.js';
import { validateEnv } from './config/env.js';
import { DatabaseModule } from './database/database.module.js';
import { EstablishmentsModule } from './establishments/establishments.module.js';
import { HealthController } from './health/health.controller.js';
import { SetupModule } from './setup/setup.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    DatabaseModule,
    AuthModule,
    EstablishmentsModule,
    CommentsModule,
    SetupModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
