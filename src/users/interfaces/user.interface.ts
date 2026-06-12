import { UserRole, UserStatus } from '../entities/user.entity';

// ─────────────────────────────────────────────────────────────
// Entity Interface
// ─────────────────────────────────────────────────────────────

export interface IUser {
  id: string;
  username: string;
  email: string;
  password: string;

  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  avatarUrl: string | null;

  role: UserRole;
  status: UserStatus;

  lastLoginAt: Date | null;
  loginCount: number;

  metadata: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ─────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────

export interface CreateUserData {
  username: string;
  email: string;
  password: string;

  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;

  role?: UserRole;
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;

  status?: UserStatus;
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// Search Filter
// ─────────────────────────────────────────────────────────────

export interface UserFilter {
  role?: UserRole;
  status?: UserStatus;

  search?: string;

  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────

export interface PaginatedResult<T = IUser> {
  data: T[];

  total: number;
  page: number;
  limit: number;

  totalPages: number;
}

// ─────────────────────────────────────────────────────────────
// Repository Contract
// ─────────────────────────────────────────────────────────────

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;

  findByEmail(email: string): Promise<IUser | null>;

  findByUsername(username: string): Promise<IUser | null>;

  findAll(
    filter?: UserFilter,
  ): Promise<PaginatedResult<IUser>>;

  create(
    data: CreateUserData,
  ): Promise<IUser>;

  update(
    id: string,
    data: UpdateUserData,
  ): Promise<IUser>;

  softDelete(id: string): Promise<void>;

  bulkInsert(
    users: CreateUserData[],
  ): Promise<IUser[]>;
}