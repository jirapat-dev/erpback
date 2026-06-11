import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import {
  IUserRepository,
  CreateUserData,
  UpdateUserData,
  UserFilter,
  PaginatedResult,
  IUser,
} from './interfaces/user.interface';

@Injectable()
export class UsersRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<IUser | null> {
    // TypeORM uses parameterized queries – safe from SQL injection by design
    return this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password')         // password is normally hidden
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return this.repo.findOne({
      where: { username: username.toLowerCase() },
    });
  }

  async findAll(filter: UserFilter = {}): Promise<PaginatedResult<IUser>> {
    const { role, status, search, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('user');

    // All values passed as parameters – never interpolated directly into SQL
    if (role) { 
      qb.andWhere('user.role = :role', { role });
    }

    if (status) { 
      qb.andWhere('user.status = :status', { status });
    }

    if (search) {
      qb.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search OR user.firstName ILIKE :search)',
        // Escape wildcards so a user can't pass '%' to force a full table scan
        { search: `%${escapeWildcard(search)}%` },
      );
    }

    qb.skip(skip).take(limit).orderBy('user.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: CreateUserData): Promise<IUser> {
    // Check uniqueness first (will also be enforced by DB UNIQUE index)
    const existing = await this.repo.findOne({
      where: [{ email: data.email }, { username: data.username }],
    });
    if (existing) {
      throw new ConflictException('email or username already in use');
    }

    const user = this.repo.create(data);

    return this.repo.save(user);
  }

  async update(id: string, data: UpdateUserData): Promise<IUser> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    Object.assign(user, data);

    return this.repo.save(user);
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.repo.softDelete(id);
    if (!result.affected) { 
      throw new NotFoundException(`User ${id} not found`);
    }
  }

  // ─── Raw query example (safe parameterised) ─────────────────────────────────

  async bulkInsert(users: CreateUserData[]): Promise<IUser[]> {
    return this.dataSource.transaction(async (manager) => {
      const entities = users.map((u) => manager.create(User, u));

      return manager.save(User, entities);
    });
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function escapeWildcard(value: string): string {
  // Prevent LIKE-based injection by escaping % and _
  return value.replace(/[%_\\]/g, '\\$&');
}
