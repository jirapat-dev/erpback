import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { DocumentType } from './interfaces/document-type.eum';
import { GetDocumentsQueryDto } from './dto/get-document-query.dto';

import { DocumentsRepository  } from './documents.repository';

@Injectable()
export class DocumentsService {
    private readonly logger = new Logger(DocumentsService.name);

    constructor(
         private readonly documentsRepo: DocumentsRepository,
    ){}

    async issueCode(entityType: DocumentType){
        this.logger.log(`Issue code ${entityType}`);

        const document = await this.documentsRepo.issueCode(
            entityType
        );

        return document;
    }

    async deleteDocument(id: string){
        const deleted = await this.documentsRepo.softDeleteDocument(id);

        if(!deleted){
            throw new NotFoundException(
                'Document not found'
            );
        }

        return {
            success:true,
            message:'Document deleted'
        };
    }

    async getDocuments(query: GetDocumentsQueryDto) {

        const page = Number(query.page ?? 1);
        const pageSize = Number(query.pageSize ?? 10);

        return this.documentsRepo.findDocuments({
            entityType: query.entityType,
            search: query.search,
            page,
            pageSize,
        });
        }
}