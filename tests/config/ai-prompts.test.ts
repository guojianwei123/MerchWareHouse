import { describe, expect, it } from 'vitest';
import { GUZI_EXTRACTION_PROMPT } from '../../src/config/ai-prompts';

describe('GUZI_EXTRACTION_PROMPT', () => {
  it('requires multi-item JSON output with non-empty fallback fields', () => {
    expect(GUZI_EXTRACTION_PROMPT).toContain('{ "items": [GuziItem, ...], "failedItems"');
    expect(GUZI_EXTRACTION_PROMPT).toContain('"notes": "why this product needs manual review"');
    expect(GUZI_EXTRACTION_PROMPT).toContain('Prefer partial success');
    expect(GUZI_EXTRACTION_PROMPT).toContain('Required common string fields must be non-empty');
    expect(GUZI_EXTRACTION_PROMPT).toContain('"未知商品"');
    expect(GUZI_EXTRACTION_PROMPT).toContain('"未知角色"');
    expect(GUZI_EXTRACTION_PROMPT).toContain('Only use OCR markdown and layout text');
    expect(GUZI_EXTRACTION_PROMPT).toContain('Return ONLY one valid JSON object');
    expect(GUZI_EXTRACTION_PROMPT).toContain('Do not output markdown, explanations, or reasoning');
  });

  it('requires editable drafts for incomplete OCR product names', () => {
    expect(GUZI_EXTRACTION_PROMPT).toContain('create an editable draft instead of failedItems');
    expect(GUZI_EXTRACTION_PROMPT).toContain('only a number, price, quantity, or size fragment');
    expect(GUZI_EXTRACTION_PROMPT).toContain('OCR 未识别完整名称，请人工核对');
  });

  it('keeps named zero-price gifts while skipping unnamed gifts', () => {
    expect(GUZI_EXTRACTION_PROMPT).toContain('Include named gifts even when their visible price is 0.00');
    expect(GUZI_EXTRACTION_PROMPT).toContain('Skip unnamed gifts such as only "赠品 1件"');
  });
});
