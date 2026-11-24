import {
  EngineMode,
  ExecutionStepTrace,
  ExecutionTrace,
  SkillDefinition,
  WorkflowDefinition,
  WorkflowNode,
} from '../types';
import {
  estimateTokens,
  executeSkill,
  renderPromptTemplate,
  runChunkText,
  runExtractJson,
  runLintJson,
  runRedactPii,
  runRegexFilter,
  runSummarize,
} from './localSkills';

export interface WorkflowRunOptions {
  webgpuGenerate?: (prompt: string, systemPrompt: string) => Promise<string | null>;
}

export const DEFAULT_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'wf-incident-sanitizer',
    name: 'Incident Log Sanitizer & JSON Extractor',
    description: 'Redacts PII/API secrets locally, filters high-severity events, extracts JSON, and lints with sorted keys.',
    inputSample: [
      '2026-11-24T14:01:02Z INFO user=alex@acme.internal ip=10.42.8.19 msg="health check ok"',
      '2026-11-24T14:01:14Z ERROR service=edge-auth ip=192.168.4.22 email=ops@acme.internal token=sk-live9876543210abcdef payload={"service":"edge-auth","code":503,"retries":3,"region":"us-east"}',
      '2026-11-24T14:01:19Z WARN service=vector-index ip=172.16.0.9 phone=757-555-0194 payload={"service":"vector-index","code":429,"retries":1,"region":"eu-west"}',
      '2026-11-24T14:01:25Z INFO service=edge-auth msg="recovered worker pool"',
    ].join('\n'),
    nodes: [
      {
        id: 'node-1',
        title: 'Redact PII & Secrets',
        kind: 'redact_pii',
        enabled: true,
        config: { maskEmails: true, maskIps: true, maskSecrets: true, maskPhones: true },
      },
      {
        id: 'node-2',
        title: 'Filter Errors & Warnings',
        kind: 'regex_filter',
        enabled: true,
        config: { pattern: '(ERROR|WARN)', flags: 'i', mode: 'match-lines' },
      },
      {
        id: 'node-3',
        title: 'Extract Embedded JSON',
        kind: 'extract_json',
        enabled: true,
        config: { fallbackKeyValues: true },
      },
      {
        id: 'node-4',
        title: 'Lint & Sort JSON Keys',
        kind: 'lint_json',
        enabled: true,
        config: { sortKeys: true, indent: 2 },
      },
    ],
    updatedAt: '2026-11-24T00:00:00.000Z',
  },
  {
    id: 'wf-rag-chunker',
    name: 'Private RAG Chunker & Extractive Brief',
    description: 'Scores key sentences locally, splits text into overlapping RAG chunks, and formats a prompt envelope.',
    inputSample:
      'Edge-Forge runs deterministic AI pipelines and optional WebGPU inference strictly inside your browser tab. Sensitive customer logs, proprietary source code, and internal runbooks never leave local RAM. When a device lacks a WebGPU adapter, Edge-Forge automatically executes regex filtering, JSON linting, PII redaction, extractive summarization, and token chunking on the local CPU thread with sub-millisecond latency. Teams can export workflows as portable JSON files and inspect model VRAM fit before downloading quantized weights.',
    nodes: [
      {
        id: 'node-rag-1',
        title: 'Extractive Summary (Top 3)',
        kind: 'summarize',
        enabled: true,
        config: { maxSentences: 3 },
      },
      {
        id: 'node-rag-2',
        title: 'Overlapping Token Chunks',
        kind: 'chunk_text',
        enabled: true,
        config: { maxChars: 200, overlapChars: 40 },
      },
      {
        id: 'node-rag-3',
        title: 'Wrap Local Prompt Template',
        kind: 'template_prompt',
        enabled: true,
        config: {
          template:
            'SYSTEM: Answer strictly from local context ({{est_tokens}} est. tokens).\n\nCONTEXT CHUNKS:\n{{input}}',
        },
      },
    ],
    updatedAt: '2026-11-24T00:00:00.000Z',
  },
  {
    id: 'wf-telemetry-table',
    name: 'Telemetry KV to Markdown & Local Synthesis',
    description: 'Runs custom skills to normalize key=value telemetry into Markdown and runs WebGPU or deterministic synthesis.',
    inputSample: [
      'node=gpu-01 model=Gemma-2-2B vram_gb=1.9 latency_ms=28 status=healthy',
      'node=gpu-02 model=Llama-3.2-1B vram_gb=1.15 latency_ms=14 status=healthy',
      'node=edge-cpu model=Deterministic-Engine vram_gb=0 latency_ms=0.4 status=active',
    ].join('\n'),
    nodes: [
      {
        id: 'node-tel-1',
        title: 'Parse KV Telemetry',
        kind: 'custom_skill',
        enabled: true,
        skillId: 'skill-kv-json',
        config: {},
      },
      {
        id: 'node-tel-2',
        title: 'Format Markdown Table',
        kind: 'custom_skill',
        enabled: true,
        skillId: 'skill-md-table',
        config: {},
      },
      {
        id: 'node-tel-3',
        title: 'Local / WebGPU Synthesis',
        kind: 'webgpu_generate',
        enabled: true,
        config: {
          systemPrompt: 'Summarize the telemetry table concisely for an on-call engineer.',
        },
      },
    ],
    updatedAt: '2026-11-24T00:00:00.000Z',
  },
];

function deterministicSynthesisFallback(input: string, systemPrompt: string): string {
  const lines = input.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const summary = runSummarize(input, { maxSentences: 2 }).output;
  return [
    `[Local Deterministic Synthesis]`,
    `Directive: ${systemPrompt || 'Summarize structured pipeline payload.'}`,
    `Input metrics: ${lines.length} non-empty lines, ${input.length} chars (~${estimateTokens(input)} tokens).`,
    `Key extract:`,
    summary || input.slice(0, 280),
  ].join('\n');
}

export async function runWorkflowPipeline(
  workflow: WorkflowDefinition,
  initialInput: string,
  skills: SkillDefinition[],
  options: WorkflowRunOptions = {}
): Promise<ExecutionTrace> {
  const startedWall = new Date().toISOString();
  const totalStart = performance.now();
  const steps: ExecutionStepTrace[] = [];

  let currentPayload = initialInput;
  let usedWebGpu = false;

  for (const node of workflow.nodes) {
    if (!node.enabled) {
      steps.push({
        nodeId: node.id,
        nodeTitle: node.title,
        kind: node.kind,
        engine: 'local-deterministic',
        status: 'skipped',
        durationMs: 0,
        inputChars: currentPayload.length,
        outputChars: currentPayload.length,
        estimatedTokens: estimateTokens(currentPayload),
        inputPreview: currentPayload.slice(0, 140),
        output: currentPayload,
        note: 'Node disabled — passed payload unchanged.',
      });
      continue;
    }

    const stepStart = performance.now();
    const inputPreview = currentPayload.slice(0, 160);

    try {
      let stepOutput = currentPayload;
      let stepEngine: EngineMode = 'local-deterministic';
      let metadata: Record<string, string | number> | undefined;
      let note: string | undefined;

      switch (node.kind) {
        case 'redact_pii': {
          const res = runRedactPii(currentPayload, node.config);
          stepOutput = res.output;
          metadata = res.metadata;
          break;
        }
        case 'regex_filter': {
          const res = runRegexFilter(currentPayload, node.config);
          stepOutput = res.output;
          metadata = res.metadata;
          break;
        }
        case 'extract_json': {
          const res = runExtractJson(currentPayload, node.config);
          stepOutput = res.output;
          metadata = res.metadata;
          break;
        }
        case 'lint_json': {
          const res = runLintJson(currentPayload, node.config);
          stepOutput = res.output;
          metadata = res.metadata;
          break;
        }
        case 'chunk_text': {
          const res = runChunkText(currentPayload, node.config);
          stepOutput = res.output;
          metadata = res.metadata;
          break;
        }
        case 'summarize': {
          const res = runSummarize(currentPayload, node.config);
          stepOutput = res.output;
          metadata = res.metadata;
          break;
        }
        case 'template_prompt': {
          const tpl = String(node.config.template || '{{input}}');
          const res = renderPromptTemplate(tpl, currentPayload);
          stepOutput = res.output;
          metadata = res.metadata;
          break;
        }
        case 'custom_skill': {
          const skill = skills.find((s) => s.id === node.skillId);
          if (!skill) {
            throw new Error(`Referenced skill "${node.skillId || 'unset'}" was not found.`);
          }
          const res = executeSkill(skill, currentPayload);
          stepOutput = res.output;
          metadata = { skill: skill.name, ...res.metadata };
          break;
        }
        case 'webgpu_generate': {
          const sysPrompt = String(node.config.systemPrompt || 'Summarize the payload concisely.');
          if (options.webgpuGenerate) {
            const webgpuOut = await options.webgpuGenerate(currentPayload, sysPrompt);
            if (webgpuOut !== null) {
              stepOutput = webgpuOut;
              stepEngine = 'webgpu-mlc';
              usedWebGpu = true;
              note = 'Executed on-device via WebGPU MLC weights.';
              break;
            }
          }
          stepOutput = deterministicSynthesisFallback(currentPayload, sysPrompt);
          stepEngine = 'local-deterministic';
          note = 'WebGPU weights not loaded — executed deterministic local synthesis fallback.';
          break;
        }
      }

      const durationMs = Number((performance.now() - stepStart).toFixed(2));
      steps.push({
        nodeId: node.id,
        nodeTitle: node.title,
        kind: node.kind,
        engine: stepEngine,
        status: 'ok',
        durationMs,
        inputChars: currentPayload.length,
        outputChars: stepOutput.length,
        estimatedTokens: estimateTokens(stepOutput),
        inputPreview,
        output: stepOutput,
        note,
        metadata,
      });

      currentPayload = stepOutput;
    } catch (err) {
      const durationMs = Number((performance.now() - stepStart).toFixed(2));
      const msg = err instanceof Error ? err.message : String(err);
      steps.push({
        nodeId: node.id,
        nodeTitle: node.title,
        kind: node.kind,
        engine: 'local-deterministic',
        status: 'error',
        durationMs,
        inputChars: currentPayload.length,
        outputChars: currentPayload.length,
        estimatedTokens: estimateTokens(currentPayload),
        inputPreview,
        output: `Error: ${msg}`,
        note: msg,
      });
      break;
    }
  }

  return {
    runId: `run-${Date.now().toString(36)}`,
    workflowId: workflow.id,
    workflowName: workflow.name,
    startedAt: startedWall,
    totalDurationMs: Number((performance.now() - totalStart).toFixed(2)),
    engineMode: usedWebGpu ? 'webgpu-mlc' : 'local-deterministic',
    steps,
    finalOutput: currentPayload,
  };
}

export function exportWorkflowJson(workflow: WorkflowDefinition): string {
  return JSON.stringify(
    {
      schema: 'edge-forge.workflow.v2',
      exportedAt: new Date().toISOString(),
      workflow,
    },
    null,
    2
  );
}

const VALID_NODE_KINDS = new Set<WorkflowNode['kind']>([
  'redact_pii',
  'regex_filter',
  'extract_json',
  'lint_json',
  'chunk_text',
  'summarize',
  'template_prompt',
  'custom_skill',
  'webgpu_generate',
]);

export function parseImportedWorkflowJson(raw: string): WorkflowDefinition {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON file: ${err instanceof Error ? err.message : String(err)}`);
  }

  const candidate =
    parsed && typeof parsed === 'object' && 'workflow' in parsed
      ? (parsed as { workflow: unknown }).workflow
      : parsed;

  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Workflow payload must be a JSON object.');
  }

  const obj = candidate as Record<string, unknown>;
  if (typeof obj.name !== 'string' || !obj.name.trim()) {
    throw new Error('Workflow must include a non-empty "name" field.');
  }
  if (!Array.isArray(obj.nodes) || obj.nodes.length === 0) {
    throw new Error('Workflow must include at least one node in "nodes".');
  }

  const normalizedNodes: WorkflowNode[] = obj.nodes.map((n, index) => {
    if (!n || typeof n !== 'object') {
      throw new Error(`Node at index ${index} is invalid.`);
    }
    const nodeObj = n as Record<string, unknown>;
    const kind = nodeObj.kind as WorkflowNode['kind'];
    if (!VALID_NODE_KINDS.has(kind)) {
      throw new Error(`Unsupported node kind "${String(nodeObj.kind)}" at index ${index}.`);
    }
    return {
      id: typeof nodeObj.id === 'string' && nodeObj.id ? nodeObj.id : `node-${Date.now()}-${index}`,
      title: typeof nodeObj.title === 'string' && nodeObj.title ? nodeObj.title : kind,
      kind,
      enabled: nodeObj.enabled !== false,
      config:
        nodeObj.config && typeof nodeObj.config === 'object' && !Array.isArray(nodeObj.config)
          ? (nodeObj.config as Record<string, string | number | boolean>)
          : {},
      skillId: typeof nodeObj.skillId === 'string' ? nodeObj.skillId : undefined,
    };
  });

  return {
    id: `wf-import-${Date.now().toString(36)}`,
    name: obj.name.trim(),
    description: typeof obj.description === 'string' ? obj.description : 'Imported Edge-Forge workflow.',
    inputSample: typeof obj.inputSample === 'string' ? obj.inputSample : '',
    nodes: normalizedNodes,
    updatedAt: new Date().toISOString(),
  };
}
