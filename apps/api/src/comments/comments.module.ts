import { Module } from '@nestjs/common';
import { EstablishmentsModule } from '../establishments/establishments.module.js';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';

@Module({
  imports: [EstablishmentsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
