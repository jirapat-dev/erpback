import { Module } from '@nestjs/common';
import { LlmService } from '../services/llm/llm.service';
import { LlmController } from '../controllers/llm/llm.controller';

@Module({
  providers: [LlmService],
  controllers: [LlmController],
  exports: [LlmService],
})
export class LlmModule {}
