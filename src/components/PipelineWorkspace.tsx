import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Cpu,
  Download,
  FileJson,
  Play,
  Plus,
  RotateCcw,
  Terminal,
  Trash2,
  Upload,
} from 'lucide-react';
import { estimateTokens } from '../engine/localSkills';
import { exportWorkflowJson, parseImportedWorkflowJson } from '../engine/workflowRunner';
import { cn } from '../lib/utils';
import {
  ExecutionTrace,
  SkillDefinition,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowNodeKind,
} from '../types';

interface PipelineWorkspaceProps {
  workflows: WorkflowDefinition[];
  activeWorkflowId: string;
  onSelectWorkflow: (id: string) => void;
  onUpdateWorkflow: (workflow: WorkflowDefinition) => void;
  onCreateWorkflow: () => void;
  onImportWorkflow: (workflow: WorkflowDefinition) => void;
  onResetDefaults: () => void;
  inputText: string;
  onInputChange: (value: string) => void;
  skills: SkillDefinition[];
  trace: ExecutionTrace | null;
  isRunning: boolean;
  onRunPipeline: () => void;
  webgpuLoadedModel: string | null;
}

const NODE_PALETTE: { kind: WorkflowNodeKind; label: string; defaultTitle: string; defaultConfig: Record<string, string | number | boolean> }[] = [
  {
    kind: 'redact_pii',
    label: 'Redact PII',
    defaultTitle: 'Redact PII & Secrets',
    defaultConfig: { maskEmails: true, maskIps: true, maskSecrets: true, maskPhones: true },
  },
  {
    kind: 'regex_filter',
    label: 'Regex Filter',
    defaultTitle: 'Regex Filter',
    defaultConfig: { pattern: '(ERROR|WARN)', flags: 'i', mode: 'match-lines' },
  },
  {
    kind: 'extract_json',
    label: 'Extract JSON',
    defaultTitle: 'Extract JSON',
    defaultConfig: { fallbackKeyValues: true },
  },
  {
    kind: 'lint_json',
    label: 'Lint JSON',
    defaultTitle: 'Lint & Sort JSON',
    defaultConfig: { sortKeys: true, indent: 2 },
  },
  {
    kind: 'chunk_text',
    label: 'Chunk Text',
    defaultTitle: 'Overlapping Chunks',
    defaultConfig: { maxChars: 240, overlapChars: 48 },
  },
  {
    kind: 'summarize',
    label: 'Summarize',
    defaultTitle: 'Extractive Summary',
    defaultConfig: { maxSentences: 3 },
  },
  {
    kind: 'template_prompt',
    label: 'Prompt Template',
    defaultTitle: 'Prompt Envelope',
    defaultConfig: { template: '### LOCAL CONTEXT ({{est_tokens}} tokens)\n{{input}}' },
  },
  {
    kind: 'custom_skill',
    label: 'Custom Skill',
    defaultTitle: 'Run Custom Skill',
    defaultConfig: {},
  },
  {
    kind: 'webgpu_generate',
    label: 'WebGPU / Local Synthesis',
    defaultTitle: 'Local / WebGPU Synthesis',
    defaultConfig: { systemPrompt: 'Summarize the structured output concisely.' },
  },
];

export const PipelineWorkspace: React.FC<PipelineWorkspaceProps> = ({
  workflows,
  activeWorkflowId,
  onSelectWorkflow,
  onUpdateWorkflow,
  onCreateWorkflow,
  onImportWorkflow,
  onResetDefaults,
  inputText,
  onInputChange,
  skills,
  trace,
  isRunning,
  onRunPipeline,
  webgpuLoadedModel,
}) => {
  const activeWorkflow = workflows.find((w) => w.id === activeWorkflowId) ?? workflows[0];
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(activeWorkflow?.nodes[0]?.id ?? null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activeWorkflow) return null;

  const updateNodes = (nodes: WorkflowNode[]) => {
    onUpdateWorkflow({
      ...activeWorkflow,
      nodes,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddNode = (kind: WorkflowNodeKind) => {
    const template = NODE_PALETTE.find((p) => p.kind === kind)!;
    const newNode: WorkflowNode = {
      id: `node-${Date.now().toString(36)}`,
      title: template.defaultTitle,
      kind,
      enabled: true,
      config: { ...template.defaultConfig },
      skillId: kind === 'custom_skill' ? skills[0]?.id : undefined,
    };
    updateNodes([...activeWorkflow.nodes, newNode]);
    setExpandedNodeId(newNode.id);
  };

  const handleMoveNode = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= activeWorkflow.nodes.length) return;
    const next = [...activeWorkflow.nodes];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    updateNodes(next);
  };

  const handleToggleNode = (nodeId: string) => {
    updateNodes(
      activeWorkflow.nodes.map((n) => (n.id === nodeId ? { ...n, enabled: !n.enabled } : n))
    );
  };

  const handleRemoveNode = (nodeId: string) => {
    updateNodes(activeWorkflow.nodes.filter((n) => n.id !== nodeId));
  };

  const handleUpdateNode = (nodeId: string, patch: Partial<WorkflowNode>) => {
    updateNodes(activeWorkflow.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)));
  };

  const handleUpdateNodeConfig = (nodeId: string, key: string, value: string | number | boolean) => {
    updateNodes(
      activeWorkflow.nodes.map((n) =>
        n.id === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n
      )
    );
  };

  const handleExportWorkflow = () => {
    const payload = exportWorkflowJson(activeWorkflow);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeWorkflow.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.edge-forge.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Exported workflow JSON.');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const text = await file.text();
      const imported = parseImportedWorkflowJson(text);
      onImportWorkflow(imported);
      setStatusMessage(`Imported "${imported.name}" (${imported.nodes.length} nodes).`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to parse workflow JSON.');
    } finally {
      event.target.value = '';
    }
  };

  const handleCopyFinalOutput = async () => {
    if (!trace?.finalOutput) return;
    try {
      await navigator.clipboard.writeText(trace.finalOutput);
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 1800);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleDownloadOutput = () => {
    if (!trace?.finalOutput) return;
    const isJson = trace.finalOutput.trim().startsWith('{') || trace.finalOutput.trim().startsWith('[');
    const blob = new Blob([trace.finalOutput], { type: isJson ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `edge-forge-output.${isJson ? 'json' : 'txt'}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const inputLines = inputText ? inputText.split(/\r?\n/).length : 0;

  return (
    <div className="space-y-6">
      {/* Workflow Control Bar */}
      <section className="panel-surface rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="workflow-select" className="font-mono text-xs uppercase tracking-wider text-slate-400">
              Workflow
            </label>
            <select
              id="workflow-select"
              value={activeWorkflow.id}
              onChange={(e) => onSelectWorkflow(e.target.value)}
              className="min-h-[44px] flex-1 rounded-xl border border-slate-700/80 bg-[#0b0e15] px-3.5 text-sm font-medium text-slate-100 focus:border-cyan-400"
            >
              {workflows.map((wf) => (
                <option key={wf.id} value={wf.id} className="bg-[#0b0e15]">
                  {wf.name} ({wf.nodes.length} nodes)
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCreateWorkflow}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              <Plus className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <span>New</span>
            </button>
            <button
              type="button"
              onClick={handleExportWorkflow}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              <Download className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              <Upload className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span>Import JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
              aria-label="Import workflow JSON file"
            />
            <button
              type="button"
              onClick={onResetDefaults}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-800 bg-transparent px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-400 sm:text-sm">
          {activeWorkflow.description}
        </p>

        {importError && (
          <div role="alert" className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
            {importError}
          </div>
        )}
        {statusMessage && (
          <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-200">
            {statusMessage}
          </div>
        )}
      </section>

      {/* Main Two-Column Workbench */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        {/* Left Column: Input Payload + Pipeline Nodes */}
        <div className="space-y-6">
          {/* Input Payload */}
          <section className="panel-surface rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-200">
                  01 · Local Input Payload
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Processed strictly inside browser memory — zero network egress.
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                <span className="rounded-md bg-slate-900 px-2 py-1">{inputLines} lines</span>
                <span className="rounded-md bg-slate-900 px-2 py-1">~{estimateTokens(inputText)} tok</span>
              </div>
            </div>

            <label htmlFor="pipeline-input-payload" className="sr-only">
              Pipeline input payload
            </label>
            <textarea
              id="pipeline-input-payload"
              value={inputText}
              onChange={(e) => onInputChange(e.target.value)}
              rows={5}
              placeholder="Paste logs, JSON, markdown notes, or key=value telemetry..."
              className="panel-inset mt-3 w-full resize-y rounded-xl p-3.5 font-mono text-xs leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-cyan-400"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onInputChange(activeWorkflow.inputSample)}
                  className="min-h-[40px] rounded-lg border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800"
                >
                  Load Sample
                </button>
                <button
                  type="button"
                  onClick={() => onInputChange('')}
                  className="min-h-[40px] rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                >
                  Clear
                </button>
              </div>
              <button
                type="button"
                onClick={onRunPipeline}
                disabled={isRunning}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-300 disabled:opacity-60"
              >
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>{isRunning ? 'Executing...' : 'Execute Chain'}</span>
              </button>
            </div>
          </section>

          {/* Node Pipeline Builder */}
          <section className="panel-surface rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-200">
                  02 · Workflow Pipeline ({activeWorkflow.nodes.length} Nodes)
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Chain deterministic transforms, custom skills, or optional WebGPU synthesis.
                </p>
              </div>
              <span className="font-mono text-[11px] text-emerald-400">
                Autosaved to localStorage
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {activeWorkflow.nodes.map((node, index) => {
                const isExpanded = expandedNodeId === node.id;
                const stepTrace = trace?.steps.find((s) => s.nodeId === node.id);

                return (
                  <div
                    key={node.id}
                    className={cn(
                      'rounded-xl border transition-colors',
                      node.enabled
                        ? 'border-slate-800 bg-[#0d111a]'
                        : 'border-slate-800/60 bg-[#0b0e14]/70 opacity-65'
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 font-mono text-[11px] font-semibold text-cyan-300">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedNodeId(isExpanded ? null : node.id)}
                          className="flex min-h-[36px] min-w-0 flex-1 items-center gap-1.5 text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                          )}
                          <span className="truncate text-sm font-medium text-slate-100">
                            {node.title}
                          </span>
                          <span className="hidden rounded border border-slate-700/80 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 sm:inline">
                            {node.kind}
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {stepTrace && (
                          <span
                            className={cn(
                              'mr-1 rounded px-1.5 py-0.5 font-mono text-[10px]',
                              stepTrace.status === 'ok'
                                ? 'bg-emerald-500/10 text-emerald-300'
                                : stepTrace.status === 'error'
                                ? 'bg-rose-500/15 text-rose-300'
                                : 'bg-slate-800 text-slate-400'
                            )}
                          >
                            {stepTrace.status === 'ok' ? `${stepTrace.durationMs}ms` : stepTrace.status}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleNode(node.id)}
                          aria-label={node.enabled ? `Disable ${node.title}` : `Enable ${node.title}`}
                          className={cn(
                            'min-h-[36px] rounded-lg border px-2 py-1 font-mono text-[10px] font-semibold uppercase',
                            node.enabled
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : 'border-slate-700 bg-slate-900 text-slate-400'
                          )}
                        >
                          {node.enabled ? 'On' : 'Off'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveNode(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move ${node.title} up`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveNode(index, 1)}
                          disabled={index === activeWorkflow.nodes.length - 1}
                          aria-label={`Move ${node.title} down`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveNode(node.id)}
                          aria-label={`Delete ${node.title}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Node Configuration */}
                    {isExpanded && (
                      <div className="border-t border-slate-800/80 bg-[#0a0d14] p-3.5 text-xs">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                              Node Label
                            </label>
                            <input
                              type="text"
                              value={node.title}
                              onChange={(e) => handleUpdateNode(node.id, { title: e.target.value })}
                              className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-700/80 bg-[#0f1420] px-2.5 text-xs text-slate-100"
                            />
                          </div>

                          {node.kind === 'regex_filter' && (
                            <>
                              <div>
                                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                  Mode
                                </label>
                                <select
                                  value={String(node.config.mode || 'match-lines')}
                                  onChange={(e) => handleUpdateNodeConfig(node.id, 'mode', e.target.value)}
                                  className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-700/80 bg-[#0f1420] px-2.5 text-xs text-slate-100"
                                >
                                  <option value="match-lines">Keep matching lines</option>
                                  <option value="exclude-lines">Exclude matching lines</option>
                                  <option value="extract-matches">Extract matches to JSON</option>
                                  <option value="replace">Regex replace</option>
                                </select>
                              </div>
                              <div>
                                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                  Pattern
                                </label>
                                <input
                                  type="text"
                                  value={String(node.config.pattern || '')}
                                  onChange={(e) => handleUpdateNodeConfig(node.id, 'pattern', e.target.value)}
                                  className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-700/80 bg-[#0f1420] px-2.5 font-mono text-xs text-cyan-200"
                                />
                              </div>
                              <div>
                                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                  Flags
                                </label>
                                <input
                                  type="text"
                                  value={String(node.config.flags || 'i')}
                                  onChange={(e) => handleUpdateNodeConfig(node.id, 'flags', e.target.value)}
                                  className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-700/80 bg-[#0f1420] px-2.5 font-mono text-xs text-slate-100"
                                />
                              </div>
                            </>
                          )}

                          {node.kind === 'chunk_text' && (
                            <>
                              <div>
                                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                  Max Chars / Chunk
                                </label>
                                <input
                                  type="number"
                                  min={80}
                                  max={4000}
                                  value={Number(node.config.maxChars ?? 240)}
                                  onChange={(e) =>
                                    handleUpdateNodeConfig(node.id, 'maxChars', Number(e.target.value) || 240)
                                  }
                                  className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-700/80 bg-[#0f1420] px-2.5 font-mono text-xs text-slate-100"
                                />
                              </div>
                              <div>
                                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                  Overlap Chars
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={800}
                                  value={Number(node.config.overlapChars ?? 48)}
                                  onChange={(e) =>
                                    handleUpdateNodeConfig(node.id, 'overlapChars', Number(e.target.value) || 0)
                                  }
                                  className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-700/80 bg-[#0f1420] px-2.5 font-mono text-xs text-slate-100"
                                />
                              </div>
                            </>
                          )}

                          {node.kind === 'summarize' && (
                            <div>
                              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                Max Sentences
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={8}
                                value={Number(node.config.maxSentences ?? 3)}
                                onChange={(e) =>
                                  handleUpdateNodeConfig(node.id, 'maxSentences', Number(e.target.value) || 3)
                                }
                                className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-700/80 bg-[#0f1420] px-2.5 font-mono text-xs text-slate-100"
                              />
                            </div>
                          )}

                          {node.kind === 'lint_json' && (
                            <div className="flex items-end">
                              <label className="inline-flex min-h-[38px] cursor-pointer items-center gap-2 text-xs text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={node.config.sortKeys !== false}
                                  onChange={(e) => handleUpdateNodeConfig(node.id, 'sortKeys', e.target.checked)}
                                  className="h-4 w-4 rounded border-slate-600 accent-cyan-400"
                                />
                                <span>Sort object keys alphabetically</span>
                              </label>
                            </div>
                          )}

                          {node.kind === 'redact_pii' && (
                            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                              {[
                                ['maskEmails', 'Emails'],
                                ['maskIps', 'IPv4'],
                                ['maskSecrets', 'API Tokens'],
                                ['maskPhones', 'Phones'],
                              ].map(([k, label]) => (
                                <label key={k} className="inline-flex cursor-pointer items-center gap-1.5 text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={node.config[k] !== false}
                                    onChange={(e) => handleUpdateNodeConfig(node.id, k, e.target.checked)}
                                    className="h-4 w-4 accent-cyan-400"
                                  />
                                  <span>{label}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {node.kind === 'custom_skill' && (
                            <div>
                              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                Skill Reference
                              </label>
                              <select
                                value={node.skillId || skills[0]?.id || ''}
                                onChange={(e) => handleUpdateNode(node.id, { skillId: e.target.value })}
                                className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-700/80 bg-[#0f1420] px-2.5 text-xs text-slate-100"
                              >
                                {skills.map((s) => (
                                  <option key={s.id} value={s.id} className="bg-[#0f1420]">
                                    {s.name} ({s.mode})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {node.kind === 'template_prompt' && (
                            <div className="sm:col-span-2">
                              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                Prompt Template (supports {'{{input}}'}, {'{{est_tokens}}'}, {'{{line_count}}'})
                              </label>
                              <textarea
                                rows={3}
                                value={String(node.config.template || '{{input}}')}
                                onChange={(e) => handleUpdateNodeConfig(node.id, 'template', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-700/80 bg-[#0f1420] p-2.5 font-mono text-xs text-cyan-200"
                              />
                            </div>
                          )}

                          {node.kind === 'webgpu_generate' && (
                            <div className="sm:col-span-2">
                              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                System Directive ({webgpuLoadedModel ? `WebGPU: ${webgpuLoadedModel}` : 'Auto-fallback to Local Deterministic Synthesis'})
                              </label>
                              <input
                                type="text"
                                value={String(node.config.systemPrompt || '')}
                                onChange={(e) => handleUpdateNodeConfig(node.id, 'systemPrompt', e.target.value)}
                                className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-700/80 bg-[#0f1420] px-2.5 text-xs text-slate-100"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Node Palette */}
            <div className="mt-4 border-t border-slate-800/80 pt-4">
              <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                Append Pipeline Node
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {NODE_PALETTE.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    onClick={() => handleAddNode(item.kind)}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-800 bg-[#0d111a] px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-200"
                  >
                    <Plus className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Live Local Execution Trace */}
        <section className="panel-surface flex flex-col rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-200">
                03 · Live Execution Trace
              </h2>
            </div>
            {trace && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px]',
                  trace.engineMode === 'webgpu-mlc'
                    ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                    : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
                )}
              >
                <Cpu className="h-3 w-3" aria-hidden="true" />
                {trace.engineMode === 'webgpu-mlc' ? 'WebGPU MLC' : 'Local Deterministic'}
              </span>
            )}
          </div>

          {/* Metrics Strip */}
          {trace ? (
            <>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="panel-inset rounded-xl p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    Total Time
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-cyan-300 sm:text-base">
                    {trace.totalDurationMs} ms
                  </p>
                </div>
                <div className="panel-inset rounded-xl p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    Nodes OK
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-emerald-300 sm:text-base">
                    {trace.steps.filter((s) => s.status === 'ok').length} / {trace.steps.length}
                  </p>
                </div>
                <div className="panel-inset rounded-xl p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    Final Output
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-100 sm:text-base">
                    ~{estimateTokens(trace.finalOutput)} tok
                  </p>
                </div>
              </div>

              {/* Final Output Block */}
              <div className="mt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                    Final Pipeline Output
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyFinalOutput}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 transition-colors hover:bg-slate-800"
                    >
                      {copiedOutput ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      )}
                      <span>{copiedOutput ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadOutput}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 transition-colors hover:bg-slate-800"
                    >
                      <FileJson className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
                <pre className="panel-inset mt-2 max-h-64 overflow-auto rounded-xl p-3.5 font-mono text-xs leading-relaxed text-emerald-200 whitespace-pre-wrap break-words">
                  {trace.finalOutput || '(empty output)'}
                </pre>
              </div>

              {/* Step-by-Step Trace Log */}
              <div className="mt-5 flex-1">
                <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  Step-by-Step Telemetry ({trace.runId})
                </p>
                <div className="mt-2.5 space-y-2">
                  {trace.steps.map((step, i) => {
                    const open = expandedStepId === step.nodeId;
                    return (
                      <div key={`${step.nodeId}-${i}`} className="panel-inset rounded-xl">
                        <button
                          type="button"
                          onClick={() => setExpandedStepId(open ? null : step.nodeId)}
                          className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={cn(
                                'h-2 w-2 shrink-0 rounded-full',
                                step.status === 'ok'
                                  ? 'bg-emerald-400'
                                  : step.status === 'error'
                                  ? 'bg-rose-400'
                                  : 'bg-slate-500'
                              )}
                            />
                            <span className="truncate text-xs font-medium text-slate-100">
                              {i + 1}. {step.nodeTitle}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-slate-400">
                            <span>{step.inputChars}→{step.outputChars}c</span>
                            <span className="text-cyan-300">{step.durationMs}ms</span>
                            {open ? (
                              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                          </div>
                        </button>

                        {step.metadata && Object.keys(step.metadata).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
                            {Object.entries(step.metadata).map(([k, v]) => (
                              <span
                                key={k}
                                className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-300"
                              >
                                {k}: <span className="text-cyan-300">{String(v)}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {step.note && (
                          <p className="px-3 pb-2.5 text-[11px] text-amber-300/90">
                            {step.note}
                          </p>
                        )}

                        {open && (
                          <div className="border-t border-slate-800/80 p-3">
                            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                              Intermediate Output
                            </p>
                            <pre className="mt-1.5 max-h-44 overflow-auto rounded-lg bg-[#080a0f] p-2.5 font-mono text-[11px] leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
                              {step.output}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="panel-inset mt-4 flex flex-1 flex-col items-center justify-center rounded-xl p-8 text-center">
              <Terminal className="h-8 w-8 text-slate-500" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-slate-200">Ready to execute locally</p>
              <p className="mt-1 max-w-xs text-xs text-slate-400">
                Click Run Pipeline to inspect step timings, redaction counts, and formatted output.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
