import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Documents } from './entities/documents.entity';
import { DocumentSequences } from './entities/document-sequences.entity';

import { DocumentsService } from './documents.service';
import { DocumentsRepository } from './documents.repository';

import { DocumentsController } from './documents.controller';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [TypeOrmModule.forFeature([Documents, DocumentSequences]), LlmModule],
  providers: [DocumentsService, DocumentsRepository],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
