import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename the legacy upper-case tables / camelCase columns to snake_case,
 * in place (data preserved — no copy). Mirrors the new entity mappings:
 *   "DOCUMENTS"          -> documents
 *   "DOCUMENT_SEQUENCES" -> document_sequences
 *     "entityType"       -> entity_type
 *     "lastNumber"       -> last_number
 */
export class RenameToSnakeCase1781740800000 implements MigrationInterface {
  name = 'RenameToSnakeCase1781740800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "DOCUMENTS" RENAME TO "documents"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "DOCUMENT_SEQUENCES" RENAME TO "document_sequences"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "document_sequences" RENAME COLUMN "entityType" TO "entity_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "document_sequences" RENAME COLUMN "lastNumber" TO "last_number"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "document_sequences" RENAME COLUMN "last_number" TO "lastNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "document_sequences" RENAME COLUMN "entity_type" TO "entityType"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "document_sequences" RENAME TO "DOCUMENT_SEQUENCES"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "documents" RENAME TO "DOCUMENTS"`,
    );
  }
}
