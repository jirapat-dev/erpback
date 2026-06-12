import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';

import { UsersService } from '../src/users/users.service';
import {
  User,
  UserRole,
  UserStatus,
} from '../src/users/entities/user.entity';

import { CreateUserDto } from '../src/users/dto/create-user.dto';

// ─────────────────────────────────────────────────────────────
// Mock Helpers
// ─────────────────────────────────────────────────────────────

const mockUsers = new Map<string, User>();

let idCounter = 0;

function createMockUser(
  dto: Partial<User> = {},
): User {
  const user = new User();

  user.id = `mock-uuid-${++idCounter}`;

  user.username =
    dto.username ?? `user${idCounter}`;

  user.email =
    dto.email ??
    `user${idCounter}@test.com`;

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

  return Object.assign(user, dto);
}

// ─────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────

describe(
  'UsersService - Concurrent Inserts',
  () => {
    let service: UsersService;

    let repo: Partial<
      Repository<User>
    >;

    let savedEmails: Set<string>;
    let savedUsernames: Set<string>;

    beforeEach(async () => {
      mockUsers.clear();

      savedEmails = new Set();
      savedUsernames = new Set();

      idCounter = 0;

      repo = {
        create: jest
          .fn()
          .mockImplementation(
            (dto) =>
              createMockUser(dto),
          ),

        save: jest
          .fn()
          .mockImplementation(
            async (
              entity:
                | User
                | User[],
            ) => {
              if (
                Array.isArray(
                  entity,
                )
              ) {
                entity.forEach(
                  (u) =>
                    mockUsers.set(
                      u.id,
                      u,
                    ),
                );

                return entity;
              }

              mockUsers.set(
                entity.id,
                entity,
              );

              return entity;
            },
          ),

        findOne: jest
          .fn()
          .mockImplementation(
            async ({
              where,
            }) => {
              // create() duplicate check
              if (
                Array.isArray(
                  where,
                )
              ) {
                for (const u of mockUsers.values()) {
                  const emailMatch =
                    where.some(
                      (
                        w,
                      ) =>
                        w.email &&
                        u.email ===
                          w.email,
                    );

                  const usernameMatch =
                    where.some(
                      (
                        w,
                      ) =>
                        w.username &&
                        u.username ===
                          w.username,
                    );

                  if (
                    emailMatch ||
                    usernameMatch
                  ) {
                    return u;
                  }
                }

                return null;
              }

              // findById()
              for (const u of mockUsers.values()) {
                if (
                  where.id &&
                  u.id === where.id
                ) {
                  return u;
                }
              }

              return null;
            },
          ),
      };

      const mockDataSource = {
        transaction: jest
          .fn()
          .mockImplementation(
            async (
              callback: (
                manager: unknown,
              ) => Promise<unknown>,
            ) => {
              const manager = {
                getRepository:
                  jest.fn().mockReturnValue(
                    {
                      create:
                        jest
                          .fn()
                          .mockImplementation(
                            (
                              dto,
                            ) =>
                              createMockUser(
                                dto,
                              ),
                          ),

                      save: jest
                        .fn()
                        .mockImplementation(
                          async (
                            entities: User[],
                          ) => {
                            for (const u of entities) {
                              if (
                                savedEmails.has(
                                  u.email,
                                )
                              ) {
                                throw new Error(
                                  'duplicate email',
                                );
                              }

                              if (
                                savedUsernames.has(
                                  u.username,
                                )
                              ) {
                                throw new Error(
                                  'duplicate username',
                                );
                              }
                            }

                            entities.forEach(
                              (
                                u,
                              ) => {
                                savedEmails.add(
                                  u.email,
                                );

                                savedUsernames.add(
                                  u.username,
                                );

                                mockUsers.set(
                                  u.id,
                                  u,
                                );
                              },
                            );

                            return entities;
                          },
                        ),
                    },
                  ),
              };

              return callback(
                manager,
              );
            },
          ),
      };

      const module: TestingModule =
        await Test.createTestingModule(
          {
            providers: [
              UsersService,
              {
                provide:
                  getRepositoryToken(
                    User,
                  ),
                useValue: repo,
              },
              {
                provide:
                  DataSource,
                useValue:
                  mockDataSource,
              },
            ],
          },
        ).compile();

      service =
        module.get<UsersService>(
          UsersService,
        );
    });

    // ────────────────────────────────────────
    // Test 1
    // ────────────────────────────────────────

    it(
      'ควร insert user ได้สำเร็จ',
      async () => {
        (
          repo.findOne as jest.Mock
        ).mockResolvedValue(
          null,
        );

        const dto: CreateUserDto =
          {
            username:
              'testuser',
            email:
              'test@example.com',
            password:
              'Password1',
          };

        const result =
          await service.create(
            dto,
          );

        expect(
          result.username,
        ).toBe('testuser');

        expect(
          result.email,
        ).toBe(
          'test@example.com',
        );
      },
    );

    // ────────────────────────────────────────
    // Test 2
    // ────────────────────────────────────────

    it(
      'ควรรองรับ concurrent inserts ที่ข้อมูลไม่ซ้ำ',
      async () => {
        const COUNT = 50;

        const dtos =
          Array.from(
            {
              length:
                COUNT,
            },
            (_, i) => ({
              username: `user_${i}`,
              email: `user_${i}@concurrent.test`,
              password:
                'Password1',
            }),
          );

        const result =
          await service.bulkInsert(
            dtos,
          );

        expect(
          result,
        ).toHaveLength(
          COUNT,
        );

        expect(
          new Set(
            result.map(
              (
                u,
              ) =>
                u.email,
            ),
          ).size,
        ).toBe(COUNT);
      },
    );

    // ────────────────────────────────────────
    // Test 3
    // ────────────────────────────────────────

    it(
      'ควร throw เมื่อ bulk insert มี email ซ้ำ',
      async () => {
        const dtos: CreateUserDto[] =
          [
            {
              username:
                'alice',
              email:
                'dup@test.com',
              password:
                'Password1',
            },
            {
              username:
                'alice2',
              email:
                'dup@test.com',
              password:
                'Password1',
            },
          ];

        await expect(
          service.bulkInsert(
            dtos,
          ),
        ).rejects.toThrow();
      },
    );

    // ────────────────────────────────────────
    // Test 4
    // ────────────────────────────────────────

    it(
      'ควรจัดการ concurrent batches พร้อมกัน',
      async () => {
        const BATCH_SIZE = 5;
        const BATCH_COUNT = 4;

        const batches =
          Array.from(
            {
              length:
                BATCH_COUNT,
            },
            (_, b) =>
              Array.from(
                {
                  length:
                    BATCH_SIZE,
                },
                (
                  __,
                  i,
                ) => ({
                  username: `race_b${b}_u${i}`,
                  email: `race_b${b}_u${i}@test.com`,
                  password:
                    'Password1',
                }),
              ),
          );

        const results =
          await Promise.allSettled(
            batches.map(
              (
                batch,
              ) =>
                service.bulkInsert(
                  batch,
                ),
            ),
          );

        const fulfilled =
          results.filter(
            (
              r,
            ) =>
              r.status ===
              'fulfilled',
          );

        expect(
          fulfilled.length,
        ).toBe(
          BATCH_COUNT,
        );
      },
    );

    // ────────────────────────────────────────
    // Test 5
    // ────────────────────────────────────────

    it(
      'ควร throw ConflictException เมื่อ email ซ้ำ',
      async () => {
        const existingUser =
          createMockUser({
            email:
              'taken@test.com',
            username:
              'taken',
          });

        (
          repo.findOne as jest.Mock
        ).mockResolvedValue(
          existingUser,
        );

        await expect(
          service.create({
            username:
              'newuser',
            email:
              'taken@test.com',
            password:
              'Password1',
          }),
        ).rejects.toThrow(
          ConflictException,
        );
      },
    );

    // ────────────────────────────────────────
    // Test 6
    // ────────────────────────────────────────

    it(
      'ควร bulk insert 200 users ได้',
      async () => {
        const dtos =
          Array.from(
            {
              length:
                200,
            },
            (_, i) => ({
              username: `perf_user_${i}`,
              email: `perf_${i}@perf.test`,
              password:
                'Password1',
            }),
          );

        const start =
          Date.now();

        const result =
          await service.bulkInsert(
            dtos,
          );

        const elapsed =
          Date.now() - start;

        expect(
          result,
        ).toHaveLength(
          200,
        );

        expect(
          elapsed,
        ).toBeLessThan(
          500,
        );
      },
    );
  },
);