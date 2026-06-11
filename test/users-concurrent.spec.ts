/**
 * Concurrent Insert Unit Test
 * จำลองการยิง concurrent inserts พร้อมกัน — ทดสอบ race condition & duplicate handling
 * ใช้ mock repository ไม่ต้องการ DB จริง
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { UsersService } from '../src/users/users.service';
import { User, UserRole, UserStatus } from '../src/users/entities/user.entity';
import { CreateUserDto } from '../src/users/dto/create-user.dto';

// ── Mock Helpers ──────────────────────────────────────────────────────────────
const mockUsers: Map<string, User> = new Map();
let idCounter = 0;

function createMockUser(dto: Partial<CreateUserDto>): User {
  const user = new User();
  user.id = `mock-uuid-${++idCounter}`;
  user.username = dto.username ?? `user${idCounter}`;
  user.email = dto.email ?? `user${idCounter}@test.com`;
  user.password = 'hashed-password';
  user.role = UserRole.USER;
  user.status = UserStatus.ACTIVE;
  user.createdAt = new Date();
  user.updatedAt = new Date();
  user.deletedAt = null;
  user.lastLoginAt = null;
  user.loginCount = 0;
  user.metadata = {};
  user.firstName = null;
  user.lastName = null;
  user.bio = null;
  user.avatarUrl = null;
  return user;
}

// ── Test Suite ────────────────────────────────────────────────────────────────
describe('UsersService — Concurrent Inserts', () => {
  let service: UsersService;
  let repo: Partial<Repository<User>>;
  let savedEmails: Set<string>;
  let savedUsernames: Set<string>;

  beforeEach(async () => {
    mockUsers.clear();
    savedEmails = new Set();
    savedUsernames = new Set();
    idCounter = 0;

    // ── Mock Repository ───────────────────────────────────────────────────
    repo = {
      create: jest.fn().mockImplementation((dto) => createMockUser(dto)),
      save: jest.fn().mockImplementation(async (entity: User | User[]) => {
        if (Array.isArray(entity)) {
          return entity.map((u) => { mockUsers.set(u.id, u); return u; });
        }
        mockUsers.set(entity.id, entity);
        return entity;
      }),
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        for (const u of mockUsers.values()) {
          if (where.id && u.id === where.id) return u;
        }
        return null;
      }),
      createQueryBuilder: jest.fn().mockImplementation(() => {
        const qb = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[...mockUsers.values()], mockUsers.size]),
          getOne: jest.fn().mockImplementation(async () => null), // default: no conflict
        };
        return qb;
      }),
    };

    // ── Mock DataSource (for transactions) ────────────────────────────────
    const mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb: (manager: unknown) => Promise<unknown>) => {
        const manager = {
          getRepository: jest.fn().mockReturnValue({
            create: jest.fn().mockImplementation((dto) => createMockUser(dto)),
            save: jest.fn().mockImplementation(async (entities: User[], _options?: unknown) => {
              // จำลอง unique constraint — ถ้า email/username ซ้ำให้ throw
              for (const u of entities) {
                if (savedEmails.has(u.email)) {
                  throw new Error(`duplicate key value violates unique constraint "users_email_key"`);
                }
                if (savedUsernames.has(u.username)) {
                  throw new Error(`duplicate key value violates unique constraint "users_username_key"`);
                }
              }
              // commit
              for (const u of entities) {
                savedEmails.add(u.email);
                savedUsernames.add(u.username);
                mockUsers.set(u.id, u);
              }
              return entities;
            }),
          }),
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ── Test 1: Sequential inserts ────────────────────────────────────────────
  it('ควร insert ผู้ใช้ได้ถูกต้อง (sequential)', async () => {
    const dto: CreateUserDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password1',
    };

    // Mock ให้ getOne return null (ไม่มี duplicate)
    const qbMock = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    (repo.createQueryBuilder as jest.Mock).mockReturnValue(qbMock);

    const result = await service.create(dto);
    expect(result.username).toBe('testuser');
    expect(result.email).toBe('test@example.com');
    expect((result as Record<string, unknown>).password).toBeUndefined();
  });

  // ── Test 2: Concurrent inserts — no conflict ──────────────────────────────
  it('ควรรองรับ concurrent inserts ที่ข้อมูลไม่ซ้ำได้', async () => {
    const COUNT = 50;
    const dtos: CreateUserDto[] = Array.from({ length: COUNT }, (_, i) => ({
      username: `user_${i}`,
      email: `user_${i}@concurrent.test`,
      password: 'Password1',
    }));

    const batchResult = await service.bulkCreate(dtos);
    expect(batchResult).toHaveLength(COUNT);
    expect(new Set(batchResult.map((u) => u.email)).size).toBe(COUNT);
  });

  // ── Test 3: Concurrent inserts — duplicate email ──────────────────────────
  it('ควร throw error เมื่อ concurrent inserts มี email ซ้ำกัน', async () => {
    const dtos: CreateUserDto[] = [
      { username: 'alice', email: 'dup@test.com', password: 'Password1' },
      { username: 'alice2', email: 'dup@test.com', password: 'Password1' }, // ซ้ำ
    ];

    await expect(service.bulkCreate(dtos)).rejects.toThrow();
  });

  // ── Test 4: Race condition simulation ─────────────────────────────────────
  it('ควรจัดการ race condition — inserts พร้อมกัน 20 requests', async () => {
    // Batch ทั้งหมดมี unique data → ควรสำเร็จทั้งหมด
    const BATCH_SIZE = 5;
    const BATCH_COUNT = 4; // 4 batches ยิงพร้อมกัน = 20 users

    const batches: CreateUserDto[][] = Array.from({ length: BATCH_COUNT }, (_, b) =>
      Array.from({ length: BATCH_SIZE }, (__, i) => ({
        username: `race_b${b}_u${i}`,
        email: `race_b${b}_u${i}@test.com`,
        password: 'Password1',
      })),
    );

    // ยิงทุก batch พร้อมกัน
    const results = await Promise.allSettled(batches.map((b) => service.bulkCreate(b)));

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled.length).toBe(BATCH_COUNT);

    // ตรวจว่าไม่มี duplicate ใน result
    const allUsers = fulfilled.flatMap((r) => (r as PromiseFulfilledResult<typeof r>).value as { email: string }[]);
    const uniqueEmails = new Set(allUsers.map((u) => u.email));
    expect(uniqueEmails.size).toBe(allUsers.length);
  });

  // ── Test 5: Conflict detection ────────────────────────────────────────────
  it('ควร throw ConflictException เมื่อ email ซ้ำ (single create)', async () => {
    const existingUser = createMockUser({ email: 'taken@test.com', username: 'taken' });
    const qbMock = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(existingUser),
    };
    (repo.createQueryBuilder as jest.Mock).mockReturnValue(qbMock);
    // ทำให้ existingUser.email ตรงกัน
    existingUser.email = 'taken@test.com';

    await expect(
      service.create({ username: 'newuser', email: 'taken@test.com', password: 'Password1' }),
    ).rejects.toThrow(ConflictException);
  });

  // ── Test 6: Large concurrent batch performance ────────────────────────────
  it('ควรจัดการ 200 users ใน bulk insert ได้ภายใน 500ms', async () => {
    const dtos: CreateUserDto[] = Array.from({ length: 200 }, (_, i) => ({
      username: `perf_user_${i}`,
      email: `perf_${i}@perf.test`,
      password: 'Password1',
    }));

    const start = Date.now();
    const result = await service.bulkCreate(dtos);
    const elapsed = Date.now() - start;

    expect(result).toHaveLength(200);
    expect(elapsed).toBeLessThan(500); // mock ควรเร็วมาก
  });
});
