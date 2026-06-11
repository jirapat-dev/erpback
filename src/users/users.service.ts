import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';

import {
  ICreateUser,
  IUserFilter,
  IUserPaginatedResult,
  IUserPublic,
} from './interfaces/user.interface';

import { User, UserStatus } from './entities/user.entity';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // ────── Hash password (simple SHA-256 + salt) ────────────────────────────
  private hashPassword(password: string): string {
    const salt = process.env.PASSWORD_SALT ?? 'default-salt-change-me';
    return crypto
      .createHmac('sha256', salt)
      .update(password)
      .digest('hex');
  }

  // ────── Strip password from response ─────────────────────────────────────
  private toPublic(user: User): IUserPublic {
    const { password, ...rest } = user as User & { password: string };
    void password;

    return { ...rest, fullName: user.fullName };
  }

  // ────── Find by ID ────────────────────────────────────────────────────────
  async findById(id: string): Promise<IUserPublic> {
    // ใช้ parameterized query — ป้องกัน SQL injection โดย TypeORM
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) { 
      throw new NotFoundException(`ไม่พบผู้ใช้รหัส ${id}`); 
    }

    return this.toPublic(user);
  }

  // ────── Find all with pagination ──────────────────────────────────────────
  async findAll(
    filter: IUserFilter = {},
    page = 1,
    limit = 20,
  ): Promise<IUserPaginatedResult> {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.deletedAt IS NULL');

    // Dynamic filters — ทุกค่าถูก bind เป็น parameter ไม่มีการ interpolate string
    if (filter.role) { 
      qb.andWhere('u.role = :role', { role: filter.role }); 
    }

    if (filter.status) {
      qb.andWhere('u.status = :status', { status: filter.status });
    }

    if (filter.email) { 
      qb.andWhere('u.email ILIKE :email', { email: `%${filter.email}%` });
    }

    if (filter.username) { 
      qb.andWhere('u.username ILIKE :username', { username: `%${filter.username}%` });
    }

    if (filter.createdAfter) {
      qb.andWhere('u.createdAt >= :after', { after: filter.createdAfter });
    }

    if (filter.createdBefore) { 
      qb.andWhere('u.createdAt <= :before', { before: filter.createdBefore });
    }

    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit).orderBy('u.createdAt', 'DESC');

    const [users, total] = await qb.getManyAndCount();

    return {
      data: users.map((user) => this.toPublic(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ────── Create single user ────────────────────────────────────────────────
  async create(dto: CreateUserDto): Promise<IUserPublic> {
    // ตรวจสอบ duplicate ก่อน insert
    const existing = await this.userRepo
      .createQueryBuilder('u')
      .where('u.email = :email OR u.username = :username', {
        email: dto.email.toLowerCase().trim(),
        username: dto.username.toLowerCase().trim(),
      })
      .getOne();

    if (existing) {
      if (existing.email === dto.email.toLowerCase().trim()) {
        throw new ConflictException('Email นี้ถูกใช้งานแล้ว');
      }
      throw new ConflictException('Username นี้ถูกใช้งานแล้ว');
    }

    const user = this.userRepo.create({
      ...dto,
      password: this.hashPassword(dto.password),
    } as ICreateUser);

    const saved = await this.userRepo.save(user);
    this.logger.log(`Created user: ${saved.id}`);

    return this.toPublic(saved);
  }

  // ────── Bulk create (transaction) ─────────────────────────────────────────
  async bulkCreate(dtos: CreateUserDto[]): Promise<IUserPublic[]> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(User);
      const entities = dtos.map((dto) =>
        repo.create({
          ...dto,
          password: this.hashPassword(dto.password),
        } as ICreateUser),
      );

      // TypeORM batch insert — parameterized, ป้องกัน SQL injection
      const saved = await repo.save(entities, { chunk: 50 });

      return saved.map((u) => this.toPublic(u));
    });
  }

  // ────── Update ────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateUserDto): Promise<IUserPublic> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) { 
      throw new NotFoundException(`ไม่พบผู้ใช้รหัส ${id}`); 
    }

    Object.assign(user, dto);
    const updated = await this.userRepo.save(user);

    return this.toPublic(updated);
  }

  // ────── Soft delete ───────────────────────────────────────────────────────
  async remove(id: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) { 
      throw new NotFoundException(`ไม่พบผู้ใช้รหัส ${id}`); 
    }

    user.status = UserStatus.INACTIVE;

    await this.userRepo.save(user);
    await this.userRepo.softDelete(id);
    this.logger.log(`Soft deleted user: ${id}`);
  }
}
