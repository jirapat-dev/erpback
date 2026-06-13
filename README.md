# NestJS + Supabase + OpenTyphoon

โปรเจค NestJS TypeScript พร้อม PostgreSQL (Supabase), OpenTyphoon LLM, และ security best practices

## 🏗️ โครงสร้างโปรเจค

```
src/
├── main.ts                          # Entry point + Helmet + CORS
├── app.module.ts                    # Root module (Global ValidationPipe, Guards, Filters)
├── database/
│   └── database.module.ts           # TypeORM + Supabase config + connection pool
├── users/
│   ├── entities/user.entity.ts      # TypeORM Entity
│   ├── interfaces/user.interface.ts # TypeScript interfaces
│   ├── dto/create-user.dto.ts       # Validated DTO (class-validator)
│   ├── dto/update-user.dto.ts
│   ├── users.service.ts             # Business logic + parameterized queries
│   ├── users.controller.ts          # REST endpoints
│   ├── users.module.ts
│   └── users.service.spec.ts        # Unit tests
├── llm/
│   ├── llm.service.ts               # OpenTyphoon API client
│   ├── llm.controller.ts            # /api/v1/llm/chat endpoint
│   └── llm.module.ts
└── common/
    ├── filters/http-exception.filter.ts  # Global error handler
    └── guards/sanitize.guard.ts          # SQL injection pattern guard
test/
└── users-concurrent.spec.ts         # Concurrent insert tests (50-200 users)
```

## 🚀 เริ่มต้นใช้งาน

### 1. ติดตั้ง dependencies
```bash
npm install
```

### 2. รัน development
```bash
npm run start:dev
```

### 3. รัน tests
```bash
npm test                        # Unit tests ทั้งหมด
npm run test:concurrent         # Concurrent insert tests
npm run test:cov                # Coverage report
```