import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Documents } from './entities/documents.entity';
import { DocumentSequences } from './entities/document-sequences.entity';
import { DocumentType } from './interfaces/document-type.eum';


@Injectable()
export class DocumentsRepository {

  constructor(
    @InjectRepository(Documents)
    private documentRepo: Repository<Documents>,

    @InjectRepository(DocumentSequences)
    private sequenceRepo: Repository<DocumentSequences>,

    private dataSource: DataSource,
  ) {}

  async issueCode(entityType: DocumentType) {

    const year = new Date().getFullYear() + 543;

    return this.dataSource.transaction(async (manager) => {

      const sequenceRepo = manager.getRepository(DocumentSequences);
      const documentRepo = manager.getRepository(Documents);

      // 1. lock sequence row
      let sequence = await sequenceRepo
        .createQueryBuilder('seq')
        .setLock('pessimistic_write')
        .where('seq.entityType = :entityType', { entityType })
        .andWhere('seq.year = :year', { year })
        .getOne();


      // 2. create if not exists (safe under lock)
      if (!sequence) {
        sequence = sequenceRepo.create({
          entityType,
          year,
          lastNumber: 0,
        });

        sequence = await sequenceRepo.save(sequence);
      }

      // 3. increment safely
      sequence.lastNumber += 1;
      await sequenceRepo.save(sequence);

      // 4. generate code
      const code = `${this.getPrefix(entityType)}-${year}-${String(sequence.lastNumber).padStart(4, '0')}`;

      // 5. save document
      const doc = documentRepo.create({
        entityType,
        code,
      });

      await documentRepo.save(doc);

      return {
        id: doc.id,
        code: doc.code,
        entityType: doc.entityType,
        createdAt: doc.createdAt,
      };
    });
  }

  async softDeleteDocument(id: string) {
    const document = await this.documentRepo.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.documentRepo.softRemove(document);

    return {
      success: true,
      id: document.id,
      deletedAt: new Date(),
    };
  }

  async findDocuments(query: {
    entityType?: string;
    search?: string;
    page: number;
    pageSize: number;
  }) {

    const qb = this.documentRepo.createQueryBuilder('doc');

    // ❌ exclude soft delete
    qb.where('doc.deletedAt IS NULL');

    // filter entityType
    if (query.entityType) {
      qb.andWhere('doc.entityType = :entityType', {
        entityType: query.entityType,
      });
    }

    // search by code
    if (query.search) {
      qb.andWhere('doc.code ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('doc.createdAt', 'DESC');

    qb.skip((query.page - 1) * query.pageSize);
    qb.take(query.pageSize);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  private getPrefix(type: DocumentType) {
    switch (type) {
      case DocumentType.WORK_ORDER:
        return 'WO';
      case DocumentType.CONTRACT:
        return 'CT';
      case DocumentType.ISSUE_NOTE:
        return 'ISS';
      default:
        throw new Error('Invalid entity type');
    }
  }
}