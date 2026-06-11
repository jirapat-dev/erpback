import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'username ต้องเป็นตัวอักษร ตัวเลข _ หรือ - เท่านั้น',
  })
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  username: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'รูปแบบ email ไม่ถูกต้อง' })
  @MaxLength(255)
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  email: string;

  /**
   * Password ต้องมีอย่างน้อย 8 ตัว, ตัวพิมพ์ใหญ่ 1 ตัว, ตัวเลข 1 ตัว
   * Hash ก่อน save ใน UsersService
   */
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'password ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว และตัวเลขอย่างน้อย 1 ตัว',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
