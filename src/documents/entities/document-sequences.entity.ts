import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('document_sequences')
@Unique('UQ_DOCUMENT_SEQUENCES_TYPE_YEAR', ['entityType', 'year'])
export class DocumentSequences {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column()
  year: number;

  @Column({
    name: 'last_number',
    default: 0,
  })
  lastNumber: number;
}
