import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { DocumentType } from './interfaces/document-type.eum';
import { GetDocumentsQueryDto } from './dto/get-document-query.dto';

import { DocumentsRepository  } from './documents.repository';
import { LlmService } from '../llm/llm.service';

/** Types the AI may actually classify into (UNKNOWN is the fallback, not a target). */
const CLASSIFIABLE_TYPES = [
    DocumentType.WORK_ORDER,
    DocumentType.CONTRACT,
    DocumentType.ISSUE_NOTE,
] as const;

/** Rule-based keyword fallback when the LLM is unavailable or unreliable. */
const KEYWORD_RULES: { type: DocumentType; keywords: string[] }[] = [
    {
        type: DocumentType.WORK_ORDER,
        keywords: ['ซ่อม', 'เสีย', 'ชำรุด', 'แจ้งซ่อม', 'บำรุง', 'repair', 'broken', 'fix', 'maintenance'],
    },
    {
        type: DocumentType.CONTRACT,
        keywords: ['สัญญา', 'ผู้ขาย', 'จัดซื้อ', 'ต่อสัญญา', 'contract', 'vendor', 'agreement', 'supplier'],
    },
    {
        type: DocumentType.ISSUE_NOTE,
        keywords: ['เบิก', 'พัสดุ', 'ใบเบิก', 'คลัง', 'issue', 'stock', 'withdraw', 'requisition'],
    },
];

export interface ClassifyResult {
    entityType: DocumentType;
    confidence?: number;
    code?: string;
}

@Injectable()
export class DocumentsService {
    private readonly logger = new Logger(DocumentsService.name);

    constructor(
         private readonly documentsRepo: DocumentsRepository,
         private readonly llmService: LlmService,
    ){}

    async issueCode(entityType: DocumentType){
        this.logger.log(`Issue code ${entityType}`);

        const document = await this.documentsRepo.issueCode(
            entityType
        );

        return document;
    }

    async deleteDocument(id: string){
        const deleted = await this.documentsRepo.softDeleteDocument(id);

        if(!deleted){
            throw new NotFoundException(
                'Document not found'
            );
        }

        return {
            success:true,
            message:'Document deleted'
        };
    }

    async getDocuments(query: GetDocumentsQueryDto) {

        const page = Number(query.page ?? 1);
        const pageSize = Number(query.pageSize ?? 10);

        return this.documentsRepo.findDocuments({
            entityType: query.entityType,
            search: query.search,
            page,
            pageSize,
        });
        }

    async classify(text: string): Promise<ClassifyResult> {
        const guess = await this.guessEntityType(text);

        if (guess.entityType === DocumentType.UNKNOWN) {
            this.logger.warn(`Classify could not determine a type for: "${text.slice(0, 60)}"`);
            
            return { entityType: DocumentType.UNKNOWN };
        }

        const document = await this.issueCode(guess.entityType);

        return {
            entityType: guess.entityType,
            confidence: guess.confidence,
            code: document.code,
        };
    }

    private async guessEntityType(
        text: string,
    ): Promise<{ entityType: DocumentType; confidence?: number }> {
        // 1) Try the LLM with structured output.
        try {
            const raw = await this.llmService.chat(text, {
                temperature: 0,
                maxTokens: 200,
                systemPrompt:
                    'You classify Thai/English hospital ERP documents. ' +
                    'Respond ONLY with compact JSON, no prose, no markdown: ' +
                    '{"entityType":"work_order|contract|issue_note","confidence":<0..1>}. ' +
                    'work_order = repair/maintenance. contract = vendor/purchasing agreements. ' +
                    'issue_note = withdrawing supplies/stock.',
            });

            const parsed = this.parseClassification(raw);
            if (parsed) {
                return parsed;
            }

            this.logger.warn('LLM classification invalid/unparseable;');
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`LLM classify failed (${msg});`);
        }

        // 2) Rule-based fallback (also covers no-API-key / timeout).
        return this.keywordFallback(text);
    }

    /** Safely extract + validate the LLM's JSON. Returns null if untrustworthy. */
    private parseClassification(
        raw: string,
    ): { entityType: DocumentType; confidence?: number } | null {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) { 
            return null; 
        }

        let data: unknown;
        try {
            data = JSON.parse(match[0]);
        } catch {
            return null;
        }

        const entityType = (data as { entityType?: unknown })?.entityType;
        const isAllowed = CLASSIFIABLE_TYPES.some((t) => t === entityType);
        if (!isAllowed) { 
            return null; 
        }

        const rawConfidence = (data as { confidence?: unknown })?.confidence;
        const confidence =
            typeof rawConfidence === 'number' && rawConfidence >= 0 && rawConfidence <= 1
                ? rawConfidence
                : undefined;

        return { entityType: entityType as DocumentType, confidence };
    }

    private keywordFallback(text: string): {
        entityType: DocumentType;
        confidence?: number;
    } {
        const lower = text.toLowerCase();

        // Score every category by how many of its keywords appear.
        const scored = KEYWORD_RULES.map((rule) => ({
            type: rule.type,
            hits: rule.keywords.filter((k) => lower.includes(k.toLowerCase()))
                .length,
        }))
            .filter((s) => s.hits > 0)
            .sort((a, b) => b.hits - a.hits);

        if (scored.length === 0) {
            return { entityType: DocumentType.UNKNOWN };
        }

        const top = scored[0];
        const contested = scored.length > 1 && scored[1].hits === top.hits;

        // Confidence we compute ourselves (not the LLM's self-report):
        //  - tie between categories  -> low (0.6), ambiguous
        //  - 1 clean keyword hit     -> 0.8
        //  - more hits, no conflict  -> up to 0.99
        const confidence = contested
            ? 0.6
            : Math.min(0.8 + (top.hits - 1) * 0.1, 0.99);

        return { entityType: top.type, confidence };
    }
}