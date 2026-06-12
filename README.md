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
npm install helmet  # เพิ่ม security headers
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

### Users
```
GET    /api/v1/users              # List (with pagination & filter)
GET    /api/v1/users/:id          # Get by ID (UUID validated)
POST   /api/v1/users              # Create user
POST   /api/v1/users/bulk         # Bulk create (transaction)
PATCH  /api/v1/users/:id          # Update
DELETE /api/v1/users/:id          # Soft delete
```

### LLM
```
POST   /api/v1/llm/chat           # Chat with OpenTyphoon
```

## 🧪 Concurrent Insert Tests

ไฟล์ `test/users-concurrent.spec.ts` จำลองสถานการณ์:
- **Test 1**: Sequential insert — ตรวจ basic functionality
- **Test 2**: 50 users concurrent bulk insert — ไม่มี conflict
- **Test 3**: Duplicate email detection ใน bulk
- **Test 4**: 4 batches × 5 users ยิงพร้อมกันด้วย `Promise.allSettled`
- **Test 5**: ConflictException สำหรับ single create ซ้ำ
- **Test 6**: Performance — 200 users ใน < 500ms (mock)

## 🔌 OpenTyphoon LLM


## 🚀 ส่วนที่ทำเสร็จแล้ว
✔ Part 1: Collision-safe Code Service
- Create document:       POST   /api/v1/documents
- Soft delete document:  DELETE /api/v1/documents

✔ Part 2: Auto Code Generation (Core Logic)
- Generate unique document code
- Format: {PREFIX}-{YEAR_BE}-{SEQUENCE}
- Reset sequence every year
- Guarantee uniqueness under concurrent requests
- Respect soft delete (deleted data still consumes code)
