import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl:
      process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: process.env.NODE_ENV === 'development', // ❗ false in production
    logging: process.env.NODE_ENV === 'development',
    // Connection pool (prevent connection exhaustion under concurrent load)
    extra: {
      max: 50,              // max pool connections
      min: 2,               // keep at least 2 alive
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,    
  },
  }),
);
