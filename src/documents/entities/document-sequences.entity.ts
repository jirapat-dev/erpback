import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
//   Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

@Entity('DOCUMENT_SEQUENCES')
export class DocumentSequences {
  @PrimaryGeneratedColumn()
  id:number;


  @Column()
  entityType:string;


  @Column()
  year:number;


  @Column({
    default:0
  })
  lastNumber:number;

}