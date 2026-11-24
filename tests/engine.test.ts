import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateModelFit,
  MODEL_CATALOG,
} from '../src/engine/hardwareInspector';
import {
  DEFAULT_SKILLS,
  executeSkill,
  renderPromptTemplate,
  runChunkText,
  runExtractJson,
  runLintJson,
  runRedactPii,
  runRegexFilter,
  runSummarize,
  safeMathEval,
} from '../src/engine/localSkills';
import {
  DEFAULT_WORKFLOWS,
  exportWorkflowJson,
  parseImportedWorkflowJson,
  runWorkflowPipeline,
} from '../src/engine/workflowRunner';

test('safeMathEval computes valid arithmetic and rejects unsafe strings', () => {
  assert.equal(safeMathEval('(8 * 1024) / 512'), 16);
  assert.equal(safeMathEval('2 ^ 10'), 1024);
  assert.equal(safeMathEval('-5 + 12.5 * 2'), 20);
  assert.throws(() => safeMathEval('10 / 0'), /Division by zero/);
  assert.throws(() => safeMathEval('process.exit(1)'), /Only numbers and operators/);
});

test('runRedactPii masks emails, IPv4, API secrets, and phone numbers', () => {
  const raw = 'user=ops@acme.io ip=192.168.1.44 key=sk-abcdef1234567890 phone=757-555-0194';
  const res = runRedactPii(raw, {
    maskEmails: true,
    maskIps: true,
    maskSecrets: true,
    maskPhones: true,
  });
  assert.ok(res.output.includes('[REDACTED_EMAIL]'));
  assert.ok(res.output.includes('[REDACTED_IP]'));
  assert.ok(res.output.includes('[REDACTED_SECRET]'));
  assert.ok(res.output.includes('[REDACTED_PHONE]'));
  assert.equal(res.metadata?.redactions, 4);
});

test('runRegexFilter matches lines and handles invalid regex gracefully', () => {
  const text = 'INFO ok\nERROR failed auth\nWARN slow query';
  const res = runRegexFilter(text, { pattern: '(ERROR|WARN)', flags: 'i', mode: 'match-lines' });
  assert.equal(res.output, 'ERROR failed auth\nWARN slow query');
  assert.equal(res.metadata?.matchedLines, 2);
  assert.throws(() => runRegexFilter(text, { pattern: '[unclosed', flags: '' }), /Invalid regex/);
});

test('runExtractJson and runLintJson extract embedded objects and sort keys', () => {
  const raw = 'log prefix payload={"z":1,"a":2,"nested":{"b":true,"a":false}} suffix';
  const extracted = runExtractJson(raw, { fallbackKeyValues: true });
  const linted = runLintJson(extracted.output, { sortKeys: true, indent: 2 });
  const parsed = JSON.parse(linted.output);
  assert.deepEqual(Object.keys(parsed), ['a', 'nested', 'z']);
  assert.deepEqual(Object.keys(parsed.nested), ['a', 'b']);
  assert.equal(linted.metadata?.valid, 'true');
});

test('runChunkText splits long text into overlapping chunks with token estimates', () => {
  const longText = Array.from({ length: 12 }, (_, i) => `Sentence number ${i + 1} verifies overlapping local chunk generation.`).join(' ');
  const res = runChunkText(longText, { maxChars: 160, overlapChars: 32 });
  const parsed = JSON.parse(res.output);
  assert.ok(parsed.chunkCount >= 3);
  assert.ok(parsed.chunks[0].estimatedTokens > 0);
});

test('runSummarize selects top-scored sentences deterministically', () => {
  const doc = [
    'WebGPU runs local model inference inside browser tabs.',
    'Edge-Forge redacts private secrets before extraction.',
    'Deterministic transforms execute with sub-millisecond latency when WebGPU is unavailable.',
    'Teams export portable workflow JSON manifests for reproducible audits.',
  ].join(' ');
  const res = runSummarize(doc, { maxSentences: 2 });
  assert.equal(res.output.split('\n').length, 2);
  assert.equal(res.metadata?.sentencesSelected, 2);
});

test('renderPromptTemplate interpolates built-in and JSON fields', () => {
  const res = renderPromptTemplate('Service={{service}} Words={{word_count}}', '{"service":"edge-auth"}');
  assert.equal(res.output, 'Service=edge-auth Words=1');
});

test('executeSkill executes all default skills without errors', () => {
  for (const skill of DEFAULT_SKILLS) {
    const res = executeSkill(skill, skill.testInput);
    assert.ok(res.output.length > 0, `Expected non-empty output for ${skill.name}`);
  }
});

test('runWorkflowPipeline runs all default workflows locally including WebGPU fallback', async () => {
  for (const wf of DEFAULT_WORKFLOWS) {
    const trace = await runWorkflowPipeline(wf, wf.inputSample, DEFAULT_SKILLS);
    assert.equal(trace.steps.length, wf.nodes.length);
    assert.ok(trace.steps.every((s) => s.status === 'ok'), `Expected all nodes ok in ${wf.name}`);
    assert.ok(trace.finalOutput.length > 0);
    assert.equal(trace.engineMode, 'local-deterministic');
  }
});

test('workflow export/import round-trips and validates malformed inputs', () => {
  const serialized = exportWorkflowJson(DEFAULT_WORKFLOWS[0]);
  const imported = parseImportedWorkflowJson(serialized);
  assert.equal(imported.name, DEFAULT_WORKFLOWS[0].name);
  assert.equal(imported.nodes.length, DEFAULT_WORKFLOWS[0].nodes.length);
  assert.throws(() => parseImportedWorkflowJson('{"name":"Bad","nodes":[]}'), /at least one node/);
});

test('evaluateModelFit distinguishes fits, tight, exceeds, and cpu-only budgets', () => {
  const smol = MODEL_CATALOG.find((m) => m.id.startsWith('SmolLM2'))!;
  const llama8b = MODEL_CATALOG.find((m) => m.id === 'Llama-3.1-8B-Instruct-q4f16_1-MLC')!;

  assert.equal(
    evaluateModelFit(smol, { webgpuSupported: false, estimatedVramGB: 0, deviceMemoryGB: 8 }).status,
    'cpu-only'
  );
  assert.equal(
    evaluateModelFit(smol, { webgpuSupported: true, estimatedVramGB: 4, deviceMemoryGB: 8 }).status,
    'fits'
  );
  assert.equal(
    evaluateModelFit(llama8b, { webgpuSupported: true, estimatedVramGB: 2, deviceMemoryGB: 4 }).status,
    'exceeds'
  );
  assert.equal(
    evaluateModelFit(llama8b, { webgpuSupported: true, estimatedVramGB: 6, deviceMemoryGB: 16 }).status,
    'tight'
  );
});
