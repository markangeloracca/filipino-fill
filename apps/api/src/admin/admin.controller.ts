import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { Roles } from '../auth/decorators.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateEstablishmentDto, UpdateEstablishmentDto } from '../establishments/dto/upsert-establishment.dto.js';
import type { EstablishmentDetail } from '../establishments/establishment.model.js';
import { EstablishmentsService } from '../establishments/establishments.service.js';
import { AdminStatsService, type PlatformStats } from './admin-stats.service.js';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class AdminController {
  constructor(
    private readonly stats: AdminStatsService,
    private readonly establishments: EstablishmentsService,
  ) {}

  @Get('stats')
  getStats(): Promise<PlatformStats> {
    return this.stats.stats();
  }

  @Post('establishments')
  create(@Body() dto: CreateEstablishmentDto): Promise<EstablishmentDetail> {
    return this.establishments.create(dto);
  }

  @Patch('establishments/:id')
  update(@Param('id') id: string, @Body() dto: UpdateEstablishmentDto): Promise<EstablishmentDetail> {
    return this.establishments.update(id, dto);
  }

  @Delete('establishments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.establishments.remove(id);
  }
}
