export type WorkflowNodeKind =
  | 'redact_pii'
  | 'regex_filter'
  | 'extract_json'
  | 'lint_json'
  | 'chunk_text'
  | 'summarize'
  | 'template_prompt'
  | 'custom_skill'
  | 'webgpu_generate';

export interface WorkflowNode {
  id: string;
  title: string;
  kind: WorkflowNodeKind;
  enabled: boolean;
  config: Record<string, string | number | boolean>;
  skillId?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  inputSample: string;
  nodes: WorkflowNode[];
  updatedAt: string;
}

export type SkillTransformOp =
  | 'word_freq'
  | 'extract_urls'
  | 'extract_emails'
  | 'dedupe_lines'
  | 'kv_to_json'
  | 'markdown_table'
  | 'math_eval'
  | 'uppercase'
  | 'lowercase';

export interface SkillDefinition {
  id: string;
  name: string;
  category: 'Extract' | 'Transform' | 'Prompt' | 'Compute';
  description: string;
  mode: 'template' | 'transform';
  template: string;
  transformOp?: SkillTransformOp;
  testInput: string;
  updatedAt: string;
}

export type EngineMode = 'local-deterministic' | 'webgpu-mlc';

export interface ExecutionStepTrace {
  nodeId: string;
  nodeTitle: string;
  kind: WorkflowNodeKind;
  engine: EngineMode;
  status: 'ok' | 'skipped' | 'error';
  durationMs: number;
  inputChars: number;
  outputChars: number;
  estimatedTokens: number;
  inputPreview: string;
  output: string;
  note?: string;
  metadata?: Record<string, string | number>;
}

export interface ExecutionTrace {
  runId: string;
  workflowId: string;
  workflowName: string;
  startedAt: string;
  totalDurationMs: number;
  engineMode: EngineMode;
  steps: ExecutionStepTrace[];
  finalOutput: string;
}

export interface HardwareProfile {
  webgpuSupported: boolean;
  adapterVendor: string;
  adapterArchitecture: string;
  adapterDescription: string;
  maxBufferSizeMB: number | null;
  maxStorageBufferBindingSizeMB: number | null;
  estimatedVramGB: number;
  deviceMemoryGB: number | null;
  hardwareConcurrency: number;
  platform: string;
  recommendedEngine: EngineMode;
  detectionNotes: string;
}

export interface ModelSpec {
  id: string;
  name: string;
  family: string;
  quant: string;
  paramsB: number;
  vramRequiredGB: number;
  ramRequiredGB: number;
  contextLength: number;
  format: 'MLC-WebGPU' | 'GGUF-Q4' | 'GGUF-Q8';
  webllmCapable: boolean;
  description: string;
}

export type ModelFitStatus = 'fits' | 'tight' | 'exceeds' | 'cpu-only';

export interface ModelFitAssessment {
  status: ModelFitStatus;
  utilizationPct: number;
  headroomGB: number;
  reason: string;
}

export interface ModelStatus {
  status: 'idle' | 'loading' | 'ready' | 'error';
  progress: number;
  message: string;
  loadedModelId?: string;
}
