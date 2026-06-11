import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Defense-in-depth guard สำหรับตรวจจับ SQL injection patterns
 * การป้องกันหลักคือ TypeORM parameterized queries
 */
@Injectable()
export class SanitizeGuard implements CanActivate {
  private readonly SQL_PATTERNS = [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(--|\/\*|\*\/|;--)/,
    /(\bOR\b\s+\d+=\d+)/i,
    /xp_cmdshell/i,
    /WAITFOR\s+DELAY/i,
  ];

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const input = JSON.stringify({ ...req.body, ...req.query, ...req.params });
    for (const p of this.SQL_PATTERNS) {
      if (p.test(input)) throw new BadRequestException('Input มีรูปแบบที่ไม่ได้รับอนุญาต');
    }
    return true;
  }
}
