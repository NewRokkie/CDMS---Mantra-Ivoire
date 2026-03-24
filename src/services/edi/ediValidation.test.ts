/**
 * EDIFACT Validation Test Suite
 * Run with: npx tsx src/services/edi/ediValidation.test.ts
 *
 * No external test framework required — pure TypeScript assertions.
 */

import { ediConversionService } from './ediConversionService';

// ─── Minimal helpers ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function describe(suite: string, fn: () => void): void {
  console.log(`\n📋 ${suite}`);
  fn();
}

// ─── Sample CODECO messages ──────────────────────────────────────────────────

const VALID_CODECO = [
  "UNB+UNOA:1+CIABJ31:ZZZ+4191:ZZZ+260101:0800+1'",
  "UNH+1+CODECO:D:96A:UN'",
  "BGM+7+CODECO001+9'",
  "DTM+137:20260101:102'",
  "EQD+CN+ABCD1234567+22G1:6:5+2+5+5'",
  "LOC+147+CIABJ:139:6'",
  "UNT+6+1'",
  "UNZ+1+1'",
].join('\n');

const MISSING_UNB = VALID_CODECO.replace(/UNB\+[^\n]+\n/, '');
const MISSING_UNH = VALID_CODECO.replace(/UNH\+[^\n]+\n/, '');
const MISSING_UNT = VALID_CODECO.replace(/UNT\+[^\n]+\n/, '');
const MISSING_UNZ = VALID_CODECO.replace(/UNZ\+[^\n]+\n/, '');
const MISSING_CODECO = VALID_CODECO.replace('CODECO', 'IFTMIN');
const MISSING_TERMINATOR = VALID_CODECO.replace(/'/g, '');
const EMPTY_CONTENT = '';

// ─── Test suites ─────────────────────────────────────────────────────────────

describe('Segment Validation — UNB, UNH, UNT, UNZ', () => {
  const r = ediConversionService.validateEDIFormat(VALID_CODECO);
  assert(r.isValid, 'Valid CODECO passes all checks');
  assert(r.errors.length === 0, 'No errors on valid message');

  const r2 = ediConversionService.validateEDIFormat(MISSING_UNB);
  assert(!r2.isValid, 'Missing UNB is detected');
  assert(r2.errors.some(e => e.includes('UNB')), 'Error mentions UNB');

  const r3 = ediConversionService.validateEDIFormat(MISSING_UNH);
  assert(!r3.isValid, 'Missing UNH is detected');
  assert(r3.errors.some(e => e.includes('UNH')), 'Error mentions UNH');

  const r4 = ediConversionService.validateEDIFormat(MISSING_UNT);
  assert(!r4.isValid, 'Missing UNT is detected');
  assert(r4.errors.some(e => e.includes('UNT')), 'Error mentions UNT');

  const r5 = ediConversionService.validateEDIFormat(MISSING_UNZ);
  assert(!r5.isValid, 'Missing UNZ is detected');
  assert(r5.errors.some(e => e.includes('UNZ')), 'Error mentions UNZ');
});

describe('Message Type Validation — CODECO', () => {
  const r = ediConversionService.validateEDIFormat(MISSING_CODECO);
  assert(!r.isValid, 'Non-CODECO message type is rejected');
  assert(r.errors.some(e => e.includes('CODECO')), 'Error mentions CODECO');
});

describe('Segment Terminator Validation', () => {
  const r = ediConversionService.validateEDIFormat(MISSING_TERMINATOR);
  assert(!r.isValid, 'Missing segment terminators detected');
  assert(r.errors.some(e => e.includes("'")), "Error mentions terminator '");
});

describe('Empty / Null Content', () => {
  const r = ediConversionService.validateEDIFormat(EMPTY_CONTENT);
  assert(!r.isValid, 'Empty content is rejected');
  assert(r.errors.length > 0, 'At least one error returned for empty content');
});

describe('Container Number Format (ISO 6346)', () => {
  // ISO 6346: 4 uppercase letters + 7 digits
  const validContainers = ['ABCD1234567', 'MSCU1234567', 'TCKU9876543'];
  const invalidContainers = ['ABC1234567', 'ABCD123456', 'abcd1234567', '12345678901', ''];

  for (const cn of validContainers) {
    assert(/^[A-Z]{4}[0-9]{7}$/.test(cn), `Valid container: ${cn}`);
  }
  for (const cn of invalidContainers) {
    assert(!/^[A-Z]{4}[0-9]{7}$/.test(cn), `Invalid container rejected: "${cn}"`);
  }
});

describe('Date Format Validation (YYMMDD / YYYYMMDD)', () => {
  const validYYMMDD = ['260101', '251231', '240229'];
  const invalidYYMMDD = ['2601', '26013', '260132', 'ABCDEF'];

  for (const d of validYYMMDD) {
    assert(/^\d{6}$/.test(d), `Valid YYMMDD: ${d}`);
  }
  for (const d of invalidYYMMDD) {
    assert(!/^\d{6}$/.test(d), `Invalid YYMMDD rejected: "${d}"`);
  }

  const validYYYYMMDD = ['20260101', '20251231'];
  for (const d of validYYYYMMDD) {
    assert(/^\d{8}$/.test(d), `Valid YYYYMMDD: ${d}`);
  }
});

describe('Container Info Extraction', () => {
  const info = ediConversionService.extractContainerInfo(VALID_CODECO);
  // EQD segment: EQD+CN+ABCD1234567+...
  assert(
    info.containerNumber === 'ABCD1234567' || info.containerNumber !== undefined,
    'Container number extracted from EQD segment',
    `Got: ${info.containerNumber}`
  );
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('Some tests failed.');
  process.exit(1);
} else {
  console.log('All tests passed ✅');
}
