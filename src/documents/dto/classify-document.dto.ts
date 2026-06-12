import { IsString, MinLength } from 'class-validator';

export class ClassifyDocumentDto {

  @IsString()
  @MinLength(5)
  text: string;

}