import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole, UserStatus } from './entities/user.entity';

function makeUser(overrides: Partial<User> = {}): User {
  const u = new User();
  u.id = 'test-uuid-1';
  u.username = 'testuser';
  u.email = 'test@example.com';
  u.password = 'hashedpw';
  u.role = UserRole.USER;
  u.status = UserStatus.ACTIVE;
  u.createdAt = new Date('2024-01-01');
  u.updatedAt = new Date('2024-01-01');
  u.deletedAt = null;
  u.lastLoginAt = null;
  u.loginCount = 0;
  u.metadata = {};
  u.firstName = 'Test';
  u.lastName = 'User';
  u.bio = null;
  u.avatarUrl = null;
  return Object.assign(u, overrides);
}

describe('UsersService', () => {
  let service: UsersService;

  const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('คืน user เมื่อพบ', async () => {
      mockRepo.findOne.mockResolvedValue(makeUser());
      const result = await service.findById('test-uuid-1');
      expect(result.id).toBe('test-uuid-1');
      expect((result as Record<string, unknown>).password).toBeUndefined();
    });

    it('throw NotFoundException เมื่อไม่พบ', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('สร้าง user ใหม่สำเร็จ', async () => {
      const qb = { where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(null) };
      mockRepo.createQueryBuilder.mockReturnValue(qb);
      mockRepo.create.mockReturnValue(makeUser());
      mockRepo.save.mockResolvedValue(makeUser());

      const result = await service.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password1',
      });
      expect(result.username).toBe('testuser');
    });

    it('throw ConflictException เมื่อ email ซ้ำ', async () => {
      const existing = makeUser({ email: 'test@example.com' });
      const qb = { where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(existing) };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.create({ username: 'other', email: 'test@example.com', password: 'Password1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('อัปเดตข้อมูล user สำเร็จ', async () => {
      const user = makeUser();
      mockRepo.findOne.mockResolvedValue(user);
      mockRepo.save.mockResolvedValue({ ...user, firstName: 'Updated' } as User);

      const result = await service.update('test-uuid-1', { firstName: 'Updated' });
      expect(result.firstName).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('soft delete user สำเร็จ', async () => {
      const user = makeUser();
      mockRepo.findOne.mockResolvedValue(user);
      mockRepo.save.mockResolvedValue(user);
      mockRepo.softDelete.mockResolvedValue(undefined);

      await expect(service.remove('test-uuid-1')).resolves.not.toThrow();
      expect(mockRepo.softDelete).toHaveBeenCalledWith('test-uuid-1');
    });
  });
});
