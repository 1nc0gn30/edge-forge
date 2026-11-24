import { SkillDefinition, SkillTransformOp } from '../types';

export interface LocalOpResult {
  output: string;
  metadata?: Record<string, string | number>;
  note?: string;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'are', 'was', 'were', 'have', 'has',
  'had', 'not', 'but', 'you', 'your', 'our', 'can', 'will', 'into', 'about', 'than', 'then',
  'them', 'they', 'their', 'there', 'here', 'when', 'where', 'which', 'while', 'what', 'who',
  'how', 'all', 'any', 'both', 'each', 'more', 'most', 'other', 'some', 'such', 'only', 'own',
  'same', 'too', 'very', 'just', 'also', 'been', 'being', 'does', 'did', 'doing', 'over',
]);

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Safe recursive-descent arithmetic parser supporting +, -, *, /, %, ^, parentheses, and decimals.
 * Avoids dynamic JS code execution entirely.
 */
export function safeMathEval(expression: string): number {
  const cleaned = expression.replace(/\s+/g, '');
  if (!cleaned) {
    throw new Error('Empty arithmetic expression');
  }
  if (!/^[0-9+\-*/%^().]+$/.test(cleaned)) {
    throw new Error('Only numbers and operators (+ - * / % ^ ( )) are allowed');
  }

  let pos = 0;

  const peek = () => cleaned[pos] ?? '';
  const consume = () => cleaned[pos++];

  function parseExpression(): number {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume();
      const right = parsePower();
      if (op === '*') left *= right;
      else if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        left /= right;
      } else {
        if (right === 0) throw new Error('Modulo by zero');
        left %= right;
      }
    }
    return left;
  }

  function parsePower(): number {
    let base = parseUnary();
    if (peek() === '^') {
      consume();
      const exp = parsePower();
      base = Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek() === '+') {
      consume();
      return parseUnary();
    }
    if (peek() === '-') {
      consume();
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    if (peek() === '(') {
      consume();
      const val = parseExpression();
      if (peek() !== ')') throw new Error('Unclosed parenthesis');
      consume();
      return val;
    }

    const start = pos;
    let hasDot = false;
    while ((peek() >= '0' && peek() <= '9') || (peek() === '.' && !hasDot)) {
      if (peek() === '.') hasDot = true;
      consume();
    }

    if (pos === start) {
      throw new Error(`Unexpected token '${peek() || 'EOF'}' at position ${pos}`);
    }

    const num = Number(cleaned.slice(start, pos));
    if (!Number.isFinite(num)) {
      throw new Error('Result is not a finite number');
    }
    return num;
  }

  const result = parseExpression();
  if (pos < cleaned.length) {
    throw new Error(`Unexpected trailing character '${cleaned[pos]}' at position ${pos}`);
  }
  return Number(result.toFixed(10));
}

export function runRedactPii(
  input: string,
  config: Record<string, string | number | boolean>
): LocalOpResult {
  const maskEmails = config.maskEmails !== false;
  const maskIps = config.maskIps !== false;
  const maskSecrets = config.maskSecrets !== false;
  const maskPhones = config.maskPhones !== false;

  let text = input;
  let emailCount = 0;
  let ipCount = 0;
  let secretCount = 0;
  let phoneCount = 0;

  if (maskSecrets) {
    text = text.replace(
      /\b(?:sk-[a-zA-Z0-9_-]{12,}|ghp_[a-zA-Z0-9]{16,}|AIza[0-9A-Za-z_-]{20,}|Bearer\s+[a-zA-Z0-9._-]{12,})\b/g,
      () => {
        secretCount++;
        return '[REDACTED_SECRET]';
      }
    );
  }

  if (maskEmails) {
    text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, () => {
      emailCount++;
      return '[REDACTED_EMAIL]';
    });
  }

  if (maskIps) {
    text = text.replace(
      /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
      () => {
        ipCount++;
        return '[REDACTED_IP]';
      }
    );
  }

  if (maskPhones) {
    text = text.replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, () => {
      phoneCount++;
      return '[REDACTED_PHONE]';
    });
  }

  const totalRedactions = emailCount + ipCount + secretCount + phoneCount;
  return {
    output: text,
    metadata: {
      redactions: totalRedactions,
      emails: emailCount,
      ips: ipCount,
      secrets: secretCount,
      phones: phoneCount,
    },
  };
}

export function runRegexFilter(
  input: string,
  config: Record<string, string | number | boolean>
): LocalOpResult {
  const pattern = String(config.pattern || '(ERROR|WARN|CRITICAL)');
  const flags = String(config.flags || 'i').replace(/[^gimsuy]/g, '');
  const mode = String(config.mode || 'match-lines');
  const replacement = String(config.replacement ?? '');

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (err) {
    throw new Error(`Invalid regex "${pattern}": ${err instanceof Error ? err.message : String(err)}`);
  }

  const lines = input.split(/\r?\n/);

  if (mode === 'exclude-lines') {
    const kept = lines.filter((line) => !regex.test(line));
    return {
      output: kept.join('\n'),
      metadata: { totalLines: lines.length, keptLines: kept.length, removedLines: lines.length - kept.length },
    };
  }

  if (mode === 'extract-matches') {
    const globalFlags = flags.includes('g') ? flags : `${flags}g`;
    const globalRegex = new RegExp(pattern, globalFlags);
    const matches = Array.from(input.matchAll(globalRegex)).map((m) => m[0]);
    return {
      output: JSON.stringify(matches, null, 2),
      metadata: { matchCount: matches.length },
    };
  }

  if (mode === 'replace') {
    const globalFlags = flags.includes('g') ? flags : `${flags}g`;
    const globalRegex = new RegExp(pattern, globalFlags);
    let replacements = 0;
    const output = input.replace(globalRegex, () => {
      replacements++;
      return replacement;
    });
    return {
      output,
      metadata: { replacements },
    };
  }

  // Default: match-lines
  const matched = lines.filter((line) => regex.test(line));
  return {
    output: matched.join('\n'),
    metadata: { totalLines: lines.length, matchedLines: matched.length },
  };
}

function tryExtractBalancedJson(text: string): unknown[] {
  const results: unknown[] = [];
  let idx = 0;

  while (idx < text.length) {
    const ch = text[idx];
    if (ch === '{' || ch === '[') {
      const open = ch;
      const close = ch === '{' ? '}' : ']';
      let depth = 0;
      let inString = false;
      let escaped = false;

      for (let j = idx; j < text.length; j++) {
        const c = text[j];
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (c === '\\') {
            escaped = true;
          } else if (c === '"') {
            inString = false;
          }
          continue;
        }
        if (c === '"') {
          inString = true;
          continue;
        }
        if (c === open) depth++;
        else if (c === close) {
          depth--;
          if (depth === 0) {
            const candidate = text.slice(idx, j + 1);
            try {
              results.push(JSON.parse(candidate));
              idx = j;
            } catch {
              // Ignore non-JSON braces
            }
            break;
          }
        }
      }
    }
    idx++;
  }

  return results;
}

export function runExtractJson(
  input: string,
  config: Record<string, string | number | boolean>
): LocalOpResult {
  const fallbackKv = config.fallbackKeyValues !== false;

  // 1. Direct JSON parse
  try {
    const direct = JSON.parse(input.trim());
    return {
      output: JSON.stringify(direct, null, 2),
      metadata: { strategy: 'direct', objectsFound: Array.isArray(direct) ? direct.length : 1 },
    };
  } catch {
    // Continue to embedded extraction
  }

  // 2. Embedded balanced JSON blocks
  const embedded = tryExtractBalancedJson(input);
  if (embedded.length > 0) {
    const payload = embedded.length === 1 ? embedded[0] : embedded;
    return {
      output: JSON.stringify(payload, null, 2),
      metadata: { strategy: 'embedded-json', objectsFound: embedded.length },
    };
  }

  // 3. Structured key=value or key: value extraction per line
  if (fallbackKv) {
    const records: Record<string, string | number | boolean>[] = [];
    for (const rawLine of input.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      const pairs = Array.from(line.matchAll(/([a-zA-Z_][\w.-]*)\s*[:=]\s*("[^"]*"|[^\s,;]+)/g));
      if (pairs.length >= 2) {
        const record: Record<string, string | number | boolean> = {};
        for (const [, k, rawV] of pairs) {
          const v = rawV.replace(/^"|"$/g, '');
          if (v === 'true') record[k] = true;
          else if (v === 'false') record[k] = false;
          else if (/^-?\d+(?:\.\d+)?$/.test(v)) record[k] = Number(v);
          else record[k] = v;
        }
        records.push(record);
      }
    }

    if (records.length > 0) {
      const payload = records.length === 1 ? records[0] : records;
      return {
        output: JSON.stringify(payload, null, 2),
        metadata: { strategy: 'kv-parse', objectsFound: records.length },
      };
    }
  }

  return {
    output: JSON.stringify({ extracted: [], rawLineCount: input.split(/\r?\n/).filter(Boolean).length }, null, 2),
    metadata: { strategy: 'empty-fallback', objectsFound: 0 },
  };
}

function sortObjectKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortObjectKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

function measureJsonStats(value: unknown, depth = 0): { keys: number; maxDepth: number } {
  if (Array.isArray(value)) {
    return value.reduce(
      (acc, item) => {
        const sub = measureJsonStats(item, depth + 1);
        return { keys: acc.keys + sub.keys, maxDepth: Math.max(acc.maxDepth, sub.maxDepth) };
      },
      { keys: 0, maxDepth: depth + 1 }
    );
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.reduce(
      (acc, [, val]) => {
        const sub = measureJsonStats(val, depth + 1);
        return { keys: acc.keys + 1 + sub.keys, maxDepth: Math.max(acc.maxDepth, sub.maxDepth) };
      },
      { keys: 0, maxDepth: depth + 1 }
    );
  }
  return { keys: 0, maxDepth: depth };
}

export function runLintJson(
  input: string,
  config: Record<string, string | number | boolean>
): LocalOpResult {
  const sortKeys = config.sortKeys !== false;
  const indent = Math.max(0, Math.min(4, Number(config.indent ?? 2)));

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (err) {
    throw new Error(`JSON syntax error: ${err instanceof Error ? err.message : String(err)}`);
  }

  const normalized = sortKeys ? sortObjectKeysDeep(parsed) : parsed;
  const formatted = JSON.stringify(normalized, null, indent);
  const stats = measureJsonStats(normalized);

  return {
    output: formatted,
    metadata: {
      valid: 'true',
      keys: stats.keys,
      maxDepth: stats.maxDepth,
      bytes: new TextEncoder().encode(formatted).length,
    },
  };
}

export function runChunkText(
  input: string,
  config: Record<string, string | number | boolean>
): LocalOpResult {
  const maxChars = Math.max(80, Math.min(4000, Number(config.maxChars ?? 320)));
  const overlapChars = Math.max(0, Math.min(Math.floor(maxChars / 2), Number(config.overlapChars ?? 48)));
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      output: JSON.stringify({ chunkCount: 0, chunks: [] }, null, 2),
      metadata: { chunkCount: 0, avgTokens: 0 },
    };
  }

  const chunks: { index: number; start: number; end: number; estimatedTokens: number; text: string }[] = [];
  let start = 0;
  let index = 0;

  while (start < trimmed.length) {
    let end = Math.min(trimmed.length, start + maxChars);
    if (end < trimmed.length) {
      const slice = trimmed.slice(start, end);
      const breakPoint = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf('. '), slice.lastIndexOf(' '));
      if (breakPoint > maxChars * 0.55) {
        end = start + breakPoint + 1;
      }
    }
    const piece = trimmed.slice(start, end).trim();
    if (piece) {
      chunks.push({
        index,
        start,
        end,
        estimatedTokens: estimateTokens(piece),
        text: piece,
      });
      index++;
    }
    if (end >= trimmed.length) break;
    start = Math.max(start + 1, end - overlapChars);
  }

  const avgTokens = chunks.length
    ? Math.round(chunks.reduce((sum, c) => sum + c.estimatedTokens, 0) / chunks.length)
    : 0;

  return {
    output: JSON.stringify({ chunkCount: chunks.length, maxChars, overlapChars, chunks }, null, 2),
    metadata: { chunkCount: chunks.length, avgTokens },
  };
}

export function runSummarize(
  input: string,
  config: Record<string, string | number | boolean>
): LocalOpResult {
  const maxBullets = Math.max(1, Math.min(8, Number(config.maxSentences ?? 3)));
  const cleaned = input.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return { output: '', metadata: { sentencesSelected: 0, compressionPct: 0 } };
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 16);

  if (sentences.length <= maxBullets) {
    const out = (sentences.length ? sentences : [cleaned]).map((s) => `- ${s}`).join('\n');
    return {
      output: out,
      metadata: {
        sentencesSelected: sentences.length || 1,
        compressionPct: Math.round((out.length / Math.max(1, input.length)) * 100),
      },
    };
  }

  const freq = new Map<string, number>();
  for (const s of sentences) {
    const words = s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
    for (const w of words) {
      if (!STOP_WORDS.has(w)) {
        freq.set(w, (freq.get(w) ?? 0) + 1);
      }
    }
  }

  const scored = sentences.map((sentence, idx) => {
    const words = sentence.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
    const contentWords = words.filter((w) => !STOP_WORDS.has(w));
    const tfScore = contentWords.reduce((sum, w) => sum + (freq.get(w) ?? 0), 0) / Math.max(1, contentWords.length);
    const positionBoost = idx === 0 ? 1.25 : idx === sentences.length - 1 ? 1.1 : 1.0;
    const numericBoost = /\d/.test(sentence) ? 1.12 : 1.0;
    return { idx, sentence, score: tfScore * positionBoost * numericBoost };
  });

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxBullets)
    .sort((a, b) => a.idx - b.idx);

  const output = top.map((item) => `- ${item.sentence}`).join('\n');
  return {
    output,
    metadata: {
      totalSentences: sentences.length,
      sentencesSelected: top.length,
      compressionPct: Math.round((output.length / Math.max(1, input.length)) * 100),
    },
  };
}

export function renderPromptTemplate(template: string, input: string): LocalOpResult {
  const words = input.trim() ? input.trim().split(/\s+/).length : 0;
  const lines = input ? input.split(/\r?\n/).length : 0;
  let parsedJson: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      parsedJson = parsed as Record<string, unknown>;
    }
  } catch {
    parsedJson = null;
  }

  const vars: Record<string, string> = {
    input,
    word_count: String(words),
    char_count: String(input.length),
    line_count: String(lines),
    est_tokens: String(estimateTokens(input)),
    timestamp: new Date().toISOString(),
  };

  if (parsedJson) {
    for (const [k, v] of Object.entries(parsedJson)) {
      vars[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
  }

  let substitutions = 0;
  const output = template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      substitutions++;
      return vars[key];
    }
    return match;
  });

  return {
    output,
    metadata: { substitutions, estTokens: estimateTokens(output) },
  };
}

export function runTransformOp(op: SkillTransformOp, input: string): LocalOpResult {
  switch (op) {
    case 'uppercase':
      return { output: input.toUpperCase(), metadata: { op } };
    case 'lowercase':
      return { output: input.toLowerCase(), metadata: { op } };
    case 'dedupe_lines': {
      const seen = new Set<string>();
      const out: string[] = [];
      const lines = input.split(/\r?\n/);
      for (const line of lines) {
        const key = line.trim();
        if (!key || !seen.has(key)) {
          if (key) seen.add(key);
          out.push(line);
        }
      }
      return {
        output: out.join('\n'),
        metadata: { originalLines: lines.length, uniqueLines: out.length },
      };
    }
    case 'extract_urls': {
      const matches = Array.from(new Set(input.match(/https?:\/\/[^\s"'<>)\]]+/g) ?? []));
      return {
        output: JSON.stringify(matches, null, 2),
        metadata: { urlsFound: matches.length },
      };
    }
    case 'extract_emails': {
      const matches = Array.from(
        new Set(input.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g) ?? [])
      );
      return {
        output: JSON.stringify(matches, null, 2),
        metadata: { emailsFound: matches.length },
      };
    }
    case 'word_freq': {
      const counts = new Map<string, number>();
      const tokens = input.toLowerCase().match(/[a-z0-9_-]{3,}/g) ?? [];
      for (const token of tokens) {
        if (!STOP_WORDS.has(token)) {
          counts.set(token, (counts.get(token) ?? 0) + 1);
        }
      }
      const top = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([term, count]) => ({ term, count }));
      return {
        output: JSON.stringify(top, null, 2),
        metadata: { uniqueTerms: counts.size, returned: top.length },
      };
    }
    case 'kv_to_json':
      return runExtractJson(input, { fallbackKeyValues: true });
    case 'markdown_table': {
      let data: unknown;
      try {
        data = JSON.parse(input);
      } catch {
        // Attempt kv fallback first
        const kv = runExtractJson(input, { fallbackKeyValues: true });
        data = JSON.parse(kv.output);
      }
      const rows = Array.isArray(data) ? data : [data];
      const objectRows = rows.filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object');
      if (objectRows.length === 0) {
        return { output: '| value |\n| --- |\n| (no structured rows) |', metadata: { rows: 0 } };
      }
      const headers = Array.from(new Set(objectRows.flatMap((r) => Object.keys(r))));
      const headerLine = `| ${headers.join(' | ')} |`;
      const sepLine = `| ${headers.map(() => '---').join(' | ')} |`;
      const bodyLines = objectRows.map(
        (r) => `| ${headers.map((h) => String(r[h] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`
      );
      return {
        output: [headerLine, sepLine, ...bodyLines].join('\n'),
        metadata: { columns: headers.length, rows: objectRows.length },
      };
    }
    case 'math_eval': {
      const lines = input
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const results = lines.map((expr) => {
        const val = safeMathEval(expr);
        return `${expr} = ${val}`;
      });
      return {
        output: results.join('\n'),
        metadata: { expressionsEvaluated: results.length },
      };
    }
  }
}

export function executeSkill(skill: SkillDefinition, input: string): LocalOpResult {
  if (skill.mode === 'template') {
    return renderPromptTemplate(skill.template, input);
  }
  return runTransformOp(skill.transformOp ?? 'kv_to_json', input);
}

export const DEFAULT_SKILLS: SkillDefinition[] = [
  {
    id: 'skill-kv-json',
    name: 'kv_log_to_json',
    category: 'Extract',
    description: 'Parses structured key=value or key: value telemetry lines into normalized JSON records.',
    mode: 'transform',
    template: '',
    transformOp: 'kv_to_json',
    testInput:
      'service=edge-gateway region=us-east latency_ms=42 status=200 ok=true\nservice=vector-cache region=eu-west latency_ms=118 status=503 ok=false',
    updatedAt: '2026-11-24T00:00:00.000Z',
  },
  {
    id: 'skill-word-freq',
    name: 'top_keywords',
    category: 'Extract',
    description: 'Computes top non-stopword term frequencies for quick local topic tagging.',
    mode: 'transform',
    template: '',
    transformOp: 'word_freq',
    testInput:
      'WebGPU shaders accelerate local inference pipelines. Local pipelines keep private prompts on device with WebGPU quantization.',
    updatedAt: '2026-11-24T00:00:00.000Z',
  },
  {
    id: 'skill-md-table',
    name: 'json_to_markdown_table',
    category: 'Transform',
    description: 'Converts JSON object arrays or key-value telemetry lines into a GitHub-flavored Markdown table.',
    mode: 'transform',
    template: '',
    transformOp: 'markdown_table',
    testInput:
      '[{"model":"SmolLM2-360M","vram_gb":0.45,"status":"fits"},{"model":"Gemma-2-2B","vram_gb":1.9,"status":"fits"}]',
    updatedAt: '2026-11-24T00:00:00.000Z',
  },
  {
    id: 'skill-math-eval',
    name: 'safe_math_eval',
    category: 'Compute',
    description: 'Evaluates arithmetic expressions line-by-line using a safe recursive-descent parser (zero eval).',
    mode: 'transform',
    template: '',
    transformOp: 'math_eval',
    testInput: '(8 * 1024) / 512\n1.9 * 1.25 + 0.5\n2 ^ 10',
    updatedAt: '2026-11-24T00:00:00.000Z',
  },
  {
    id: 'skill-incident-brief',
    name: 'incident_prompt_envelope',
    category: 'Prompt',
    description: 'Wraps sanitized payload and token counts into a structured local triage prompt envelope.',
    mode: 'template',
    template:
      '### LOCAL TRIAGE ENVELOPE\n- Lines: {{line_count}} | Words: {{word_count}} | Est. Tokens: {{est_tokens}}\n- Objective: Identify root cause, impacted service, and immediate mitigation without external calls.\n\n```json\n{{input}}\n```',
    testInput: '{"service":"auth-proxy","status":503,"latency_ms":1420}',
    updatedAt: '2026-11-24T00:00:00.000Z',
  },
];
