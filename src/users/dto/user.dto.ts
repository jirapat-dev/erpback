import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  IsObject,
  IsPhoneNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole, UserStatus } from '../entities/user.entity';

// ─── Create ───────────────────────────────────────────────────────────────────

export class CreateUserDto {
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'username may only contain letters, numbers, underscores and dashes',
  })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  username!: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  // ≥8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
  @IsString()
  @Length(8, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'password must contain uppercase, lowercase, number and special character',
  })
  password!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber(undefined, { message: 'Invalid phone number' })
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber(undefined, { message: 'Invalid phone number' })
  phone?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ─── Query ────────────────────────────────────────────────────────────────────

export class UserQueryDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}
