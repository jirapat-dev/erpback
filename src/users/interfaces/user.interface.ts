import { UserRole, UserStatus } from '../entities/user.entity';

// ────── Base Interface ───────────────────────────────────────────────────────
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

// ────── Public safe view (no password) ──────────────────────────────────────
export interface IUserPublic extends Omit<IUser, 'password'> {
  fullName: string;
}

// ────── Create DTO Interface ─────────────────────────────────────────────────
export interface ICreateUser {
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

// ────── Update DTO Interface ─────────────────────────────────────────────────
export interface IUpdateUser {
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  status?: UserStatus;
  metadata?: Record<string, unknown>;
}

// ────── Query / Filter Interface ─────────────────────────────────────────────
export interface IUserFilter {
  id?: string;
  username?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  createdAfter?: Date;
  createdBefore?: Date;
}

// ────── Paginated Response ────────────────────────────────────────────────────
export interface IUserPaginatedResult {
  data: IUserPublic[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ────── Repository Interface ─────────────────────────────────────────────────
export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findByUsername(username: string): Promise<IUser | null>;
  findAll(filter: IUserFilter, page: number, limit: number): Promise<IUserPaginatedResult>;
  create(data: ICreateUser): Promise<IUser>;
  update(id: string, data: IUpdateUser): Promise<IUser>;
  softDelete(id: string): Promise<void>;
  bulkCreate(data: ICreateUser[]): Promise<IUser[]>;
}
