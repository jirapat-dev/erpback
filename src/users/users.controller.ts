import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';

import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import {
  UserRole,
  UserStatus,
} from './entities/user.entity';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // GET /users
  // ─────────────────────────────────────────────────────────────

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({
      role,
      status,
      search,
      page: Number(page),
      limit: Number(limit),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // GET /users/:id
  // ─────────────────────────────────────────────────────────────

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    return this.usersService.findById(id);
  }

  // ─────────────────────────────────────────────────────────────
  // POST /users
  // ─────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body()
    dto: CreateUserDto,
  ) {
    return this.usersService.create(dto);
  }

  // ─────────────────────────────────────────────────────────────
  // POST /users/bulk
  // ─────────────────────────────────────────────────────────────

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkInsert(
    @Body()
    dtos: CreateUserDto[],
  ) {
    return this.usersService.bulkInsert(
      dtos,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PATCH /users/:id
  // ─────────────────────────────────────────────────────────────

  @Post(':id')
  update(
    @Param('id', ParseUUIDPipe)
    id: string,

    @Body()
    dto: UpdateUserDto,
  ) {
    return this.usersService.update(
      id,
      dto,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE /users/:id
  // ─────────────────────────────────────────────────────────────

  @Post(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe)
    id: string,
  ): Promise<void> {
    await this.usersService.remove(id);
  }
}