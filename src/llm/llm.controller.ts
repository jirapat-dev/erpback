import { Body, Controller, Post } from '@nestjs/common';
import { LlmService, LLMChatOptions } from '../../services/llm/llm.service';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

class ChatDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  systemPrompt?: string;
}

@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Post('chat')
  async chat(@Body() dto: ChatDto) {
    const options: LLMChatOptions = {
      systemPrompt: dto.systemPrompt,
    };
    const reply = await this.llmService.chat(dto.message, options);
    return { reply };
  }
}
