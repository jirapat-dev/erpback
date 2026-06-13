import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Documents } from './entities/documents.entity';
import { DocumentSequences } from './entities/document-sequences.entity';
import { DocumentType } from './interfaces/document-type.eum';

@Injectable()
export class DocumentsRepository {

  private readonly logger = new Logger(DocumentsRepository.name);

  /** Postgres unique_violation. */
  private static readonly PG_UNIQUE_VIOLATION = '23505';

  /** How many times to retry a code collision before giving up. */
  private static readonly MAX_ISSUE_RETRIES = 5;

  constructor(
    @InjectRepository(Documents)
    private documentRepo: Repository<Documents>,

    @InjectRepository(DocumentSequences)
    private sequenceRepo: Repository<DocumentSequences>,

    private dataSource: DataSource,
  ) {}

  async issueCode(entityType: DocumentType) {
    const year = new Date().getFullYear() + 543;

    for (
      let attempt = 1;
      attempt <= DocumentsRepository.MAX_ISSUE_RETRIES;
      attempt++
    ) {
      try {
        return await this.issueCodeOnce(entityType, year);
      } catch (error) {
        if (
          this.isUniqueViolation(error) &&
          attempt < DocumentsRepository.MAX_ISSUE_RETRIES
        ) {
          this.logger.warn(
            `issueCode collision for ${entityType}-${year} (attempt ${attempt}); retrying`,
          );
          continue;
        }
        throw error;
      }
    }

    throw new Error(
      `issueCode: exhausted ${DocumentsRepository.MAX_ISSUE_RETRIES} retries for ${entityType}-${year}`,
    );
  }

  private async issueCodeOnce(entityType: DocumentType, year: number) {
    return this.dataSource.transaction(async (manager) => {
      const sequenceRepo = manager.getRepository(DocumentSequences);
      const documentRepo = manager.getRepository(Documents);

      // 1. lock the counter row for this (entityType, year)
      let sequence = await sequenceRepo
        .createQueryBuilder('seq')
        .setLock('pessimistic_write')
        .where('seq.entityType = :entityType', { entityType })
        .andWhere('seq.year = :year', { year })
        .getOne();

      // 2. create if missing
      if (!sequence) {
        sequence = await sequenceRepo.save(
          sequenceRepo.create({ entityType, year, lastNumber: 0 }),
        );
      }

      // 3. increment under the lock
      sequence.lastNumber += 1;
      await sequenceRepo.save(sequence);

      // 4. generate the human-readable code
      const code = `${this.getPrefix(entityType)}-${year}-${String(
        sequence.lastNumber,
      ).padStart(4, '0')}`;

      // 5. persist the document (documents.code UNIQUE is the final guard)
      const doc = documentRepo.create({ entityType, code });
      await documentRepo.save(doc);

      return {
        id: doc.id,
        code: doc.code,
        entityType: doc.entityType,
        createdAt: doc.createdAt,
      };
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    const code =
      (error as { code?: string })?.code ??
      (error as { driverError?: { code?: string } })?.driverError?.code;

    return code === DocumentsRepository.PG_UNIQUE_VIOLATION;
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