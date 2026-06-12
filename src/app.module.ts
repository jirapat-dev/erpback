import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { LlmModule } from './llm/llm.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { SanitizeGuard } from './common/guards/sanitize.guard';

@Module({
  imports: [
    // โหลด .env ก่อนทุก module
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    UsersModule,
    LlmModule,
  ],
  providers: [
    // Global exception handler
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    // SQL injection guard ทุก request
    { provide: APP_GUARD, useClass: SanitizeGuard },
    // Validation pipe — whitelist ป้องกัน unknown fields
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,           // strip fields ที่ไม่ได้ประกาศใน DTO
        // forbidNonWhitelisted: true, // throw error ถ้ามี field แปลกปลอม
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
  ],
})
export class AppModule {}
