import { Controller, Get, Param, Query } from '@nestjs/common';
import { SearchEstablishmentsQuery } from './dto/search-establishments.query.js';
import type { EstablishmentDetail, EstablishmentSummary } from './establishment.model.js';
import { EstablishmentsService } from './establishments.service.js';

@Controller('establishments')
export class EstablishmentsController {
  constructor(private readonly establishments: EstablishmentsService) {}

  @Get()
  search(@Query() query: SearchEstablishmentsQuery): Promise<EstablishmentSummary[]> {
    return this.establishments.search(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<EstablishmentDetail> {
    return this.establishments.getById(id);
  }
}
