import { Module } from '@nestjs/common';
import { EstablishmentsController } from './establishments.controller.js';
import { EstablishmentsRepository } from './establishments.repository.js';
import { EstablishmentsService } from './establishments.service.js';

@Module({
  controllers: [EstablishmentsController],
  providers: [EstablishmentsRepository, EstablishmentsService],
  exports: [EstablishmentsService],
})
export class EstablishmentsModule {}
