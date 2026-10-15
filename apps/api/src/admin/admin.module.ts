import { Module } from '@nestjs/common';
import { EstablishmentsModule } from '../establishments/establishments.module.js';
import { AdminStatsService } from './admin-stats.service.js';
import { AdminController } from './admin.controller.js';

@Module({
  imports: [EstablishmentsModule],
  controllers: [AdminController],
  providers: [AdminStatsService],
})
export class AdminModule {}
