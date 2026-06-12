import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { DocumentType } from '../interfaces/document-type.eum'

export class CreateDocumentDto {

    @IsEnum(DocumentType)
    entityType:DocumentType;

}