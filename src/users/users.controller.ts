import {
  Body,
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
  ClassSerializerInterceptor,
} from '@nestjs/common';

import { UsersService } from '../../users/users.service';

import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UpdateUserDto } from '../../users/dto/update-user.dto';
import { UserRole, UserStatus } from '../../users/entities/user.entity';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('email') email?: string,
    @Query('username') username?: string,
  ) {
    return this.usersService.findAll(
      { role, status, email, username },
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(@Body() dtos: CreateUserDto[]) {
    return this.usersService.bulkCreate(dtos);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
