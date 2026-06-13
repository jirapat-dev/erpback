import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseInterceptors,
  ParseUUIDPipe,
  Delete,
  Param,
  Query,
} from '@nestjs/common';

import { CreateDocumentDto } from './dto/create-document-dto';
import { DocumentsService } from './documents.service';
import { GetDocumentsQueryDto } from './dto/get-document-query.dto';
import { ClassifyDocumentDto } from './dto/classify-document.dto';

@Controller('documents')
@UseInterceptors(ClassSerializerInterceptor)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
  ) {}

  @Get()
  async getDocuments(@Query() query: GetDocumentsQueryDto) {
    return this.documentsService.getDocuments(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateDocumentDto
  ) {
    const document =
    await this.documentsService.issueCode(
      dto.entityType
    );

    return {
      success:true,
      data:{
        id:document.id,
        code:document.code,
        entityType:document.entityType,
        createdAt:document.createdAt
      }
    };
  }

  @Post('classify')
  @HttpCode(HttpStatus.OK)
  async classify(@Body() dto: ClassifyDocumentDto) {
    const result = await this.documentsService.classify(dto.text);

    return {
      success: true,
      data: result,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(
    @Param(
      'id',
      ParseUUIDPipe
    )
  id:string
  ){
    return this.documentsService.deleteDocument(id);
  }
}