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
  IUser,
  CreateUserData,
  UpdateUserData,
  UserFilter,
  PaginatedResult,
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

  // ─────────────────────────────────────────────────────────────
  // Password Hash
  // ─────────────────────────────────────────────────────────────

  private hashPassword(password: string): string {
    const salt =
      process.env.PASSWORD_SALT ??
      'default-salt-change-me';

    return crypto
      .createHmac('sha256', salt)
      .update(password)
      .digest('hex');
  }

  // ─────────────────────────────────────────────────────────────
  // Find User By Id
  // ─────────────────────────────────────────────────────────────

  async findById(id: string): Promise<IUser> {
    const user = await this.userRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(
        `ไม่พบผู้ใช้รหัส ${id}`,
      );
    }

    return user;
  }

  // ─────────────────────────────────────────────────────────────
  // Find All Users
  // ─────────────────────────────────────────────────────────────

  async findAll(
    filter: UserFilter = {},
  ): Promise<PaginatedResult<IUser>> {
    const {
      role,
      status,
      search,
      page = 1,
      limit = 20,
    } = filter;

    const skip = (page - 1) * limit;

    const qb = this.userRepo.createQueryBuilder('u');

    if (role) {
      qb.andWhere('u.role = :role', {
        role,
      });
    }

    if (status) {
      qb.andWhere('u.status = :status', {
        status,
      });
    }

    if (search) {
      qb.andWhere(
        `
        (
          u.username ILIKE :search
          OR u.email ILIKE :search
          OR u.firstName ILIKE :search
          OR u.lastName ILIKE :search
        )
        `,
        {
          search: `%${search}%`,
        },
      );
    }

    qb.skip(skip)
      .take(limit)
      .orderBy('u.createdAt', 'DESC');

    const [data, total] =
      await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Create User
  // ─────────────────────────────────────────────────────────────

  async create(
    dto: CreateUserDto,
  ): Promise<IUser> {
    const email = dto.email
      .toLowerCase()
      .trim();

    const username = dto.username
      .toLowerCase()
      .trim();

    const existing =
      await this.userRepo.findOne({
        where: [
          { email },
          { username },
        ],
      });

    if (existing) {
      if (existing.email === email) {
        throw new ConflictException(
          'Email นี้ถูกใช้งานแล้ว',
        );
      }

      throw new ConflictException(
        'Username นี้ถูกใช้งานแล้ว',
      );
    }

    const user = this.userRepo.create({
      ...dto,
      email,
      username,
      password: this.hashPassword(
        dto.password,
      ),
    } as CreateUserData);

    const saved = await this.userRepo.save(
      user,
    );

    this.logger.log(
      `Created user: ${saved.id}`,
    );

    return saved;
  }

  // ─────────────────────────────────────────────────────────────
  // Bulk Insert Users
  // ─────────────────────────────────────────────────────────────

  async bulkInsert(
    dtos: CreateUserDto[],
  ): Promise<IUser[]> {
    return this.dataSource.transaction(
      async (manager) => {
        const repo =
          manager.getRepository(User);

        const entities = dtos.map(
          (dto) =>
            repo.create({
              ...dto,
              email: dto.email
                .toLowerCase()
                .trim(),
              username: dto.username
                .toLowerCase()
                .trim(),
              password: this.hashPassword(
                dto.password,
              ),
            } as CreateUserData),
        );

        return repo.save(entities, {
          chunk: 50,
        });
      },
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Update User
  // ─────────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateUserDto,
  ): Promise<IUser> {
    const user = await this.userRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(
        `ไม่พบผู้ใช้รหัส ${id}`,
      );
    }

    Object.assign(
      user,
      dto as UpdateUserData,
    );

    const updated =
      await this.userRepo.save(user);

    return updated;
  }

  // ─────────────────────────────────────────────────────────────
  // Soft Delete
  // ─────────────────────────────────────────────────────────────

  async remove(
    id: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(
        `ไม่พบผู้ใช้รหัส ${id}`,
      );
    }

    user.status = UserStatus.INACTIVE;

    await this.userRepo.save(user);

    const result =
      await this.userRepo.softDelete(id);

    if (!result.affected) {
      throw new NotFoundException(
        `ไม่พบผู้ใช้รหัส ${id}`,
      );
    }

    this.logger.log(
      `Soft deleted user: ${id}`,
    );
  }
}