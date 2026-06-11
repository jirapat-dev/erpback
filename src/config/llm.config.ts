import { registerAs } from '@nestjs/config';

export default registerAs('llm', () => ({
  apiKey: process.env.OPENTYPHOON_API_KEY,
  baseUrl:
    process.env.OPENTYPHOON_BASE_URL ?? 'https://api.opentyphoon.ai/v1',
  model:
    process.env.OPENTYPHOON_MODEL ?? 'typhoon-v2-70b-instruct',
}));
