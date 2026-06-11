import { IsEnum, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { UserStatus } from '../entities/user.entity';

export class UpdateUserDto {
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
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
