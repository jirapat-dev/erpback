import { IsEnum, IsOptional, IsString, IsNumberString } from 'class-validator';
import { DocumentType } from '../interfaces/document-type.eum';

export class GetDocumentsQueryDto {

  @IsOptional()
  @IsEnum(DocumentType)
  entityType?: DocumentType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  pageSize?: string;
}