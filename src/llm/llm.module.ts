import { Module } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { LlmController } from '../llm/llm.controller';

@Module({
  providers: [LlmService],
  controllers: [LlmController],
  exports: [LlmService],
})
export class LlmModule {}
