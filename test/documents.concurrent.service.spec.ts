import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

jest.setTimeout(30000);

const request = require('supertest');

describe('Documents API Concurrency', () => {

  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();
    await app.listen(0); // 🔥 important for supertest stability
  });

  afterAll(async () => {
    await app.close();
  });

  it('should generate unique codes under concurrent requests', async () => {

    const totalRequest = 50;

    const requests = Array.from({ length: totalRequest }, () =>
      request(app.getHttpServer())
        .post('/documents')
        .send({ entityType: 'work_order' })
    );

    const responses = await Promise.all(requests);

    expect(responses.every(r => r.status === 201)).toBe(true);

    const codes = responses.map(r => r.body?.data?.code);

    expect(codes.length).toBe(totalRequest);

    expect(new Set(codes).size).toBe(totalRequest);
  });

});