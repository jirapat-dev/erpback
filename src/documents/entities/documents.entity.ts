import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
//   Index,
} from 'typeorm';

import { DocumentType } from '../interfaces/document-type.eum'

@Entity('documents')
export class Documents {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'entity_type',
    type: 'enum',
    enum: DocumentType,
  })
  entityType: DocumentType;

  @Column({
    name: 'code',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  code: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt: Date | null;

}