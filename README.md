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

### 2. สร้าง .env จาก .env.example
```bash
cp .env.example .env
# แก้ไขค่า DB_HOST, DB_PASSWORD, TYPHOON_API_KEY
```

### 3. ค่า .env สำหรับ Supabase
```env
DB_HOST=db.<project-ref>.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<supabase-db-password>
DB_NAME=postgres
DB_SSL=true

TYPHOON_API_KEY=<your-opentyphoon-key>
TYPHOON_BASE_URL=https://api.opentyphoon.ai/v1
TYPHOON_MODEL=typhoon-v2-8b-instruct
```

### 4. รัน development
```bash
npm run start:dev
```

### 5. รัน tests
```bash
npm test                        # Unit tests ทั้งหมด
npm run test:concurrent         # Concurrent insert tests
npm run test:cov                # Coverage report
```

## 🔒 Security

| ชั้น | การป้องกัน |
|------|-----------|
| TypeORM parameterized queries | ป้องกัน SQL injection หลัก |
| `SanitizeGuard` | Pattern matching สำหรับ SQL keywords น่าสงสัย |
| `ValidationPipe` + `whitelist: true` | ป้องกัน mass assignment |
| `forbidNonWhitelisted: true` | Reject fields ที่ไม่ได้ประกาศ |
| `class-validator` | ตรวจ type, length, format ของ input |
| `Helmet` | Security HTTP headers |
| `@Exclude()` บน password | ไม่ส่ง password ออก response |
| Soft delete | ไม่ลบข้อมูลถาวร |
| GlobalExceptionFilter | ซ่อน stack trace ใน production |

## 📡 API Endpoints

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

```typescript
// ใช้งานใน service อื่น
@Injectable()
export class MyService {
  constructor(private readonly llm: LlmService) {}

  async summarize(text: string) {
    return this.llm.chat(text, {
      systemPrompt: 'คุณเป็น AI ที่สรุปข้อมูลเป็นภาษาไทย',
      temperature: 0.3,
      maxTokens: 512,
    });
  }
}
```
