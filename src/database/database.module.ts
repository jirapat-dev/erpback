import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('DB_HOST'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME', 'postgres'),
        entities: [User],
        synchronize: config.get('NODE_ENV') !== 'production',
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        extra: {
          max: 20,
          min: 2,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
        logging: config.get('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
        maxQueryExecutionTime: 5000,
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),
  ],
})
export class DatabaseModule {}
