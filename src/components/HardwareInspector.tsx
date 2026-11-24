import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Download,
  Gauge,
  HardDrive,
  MemoryStick,
  Power,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import {
  evaluateModelFit,
  HARDWARE_PRESETS,
  MODEL_CATALOG,
} from '../engine/hardwareInspector';
import { cn } from '../lib/utils';
import { HardwareProfile, ModelStatus } from '../types';

interface HardwareInspectorProps {
  hardware: HardwareProfile | null;
  modelStatus: ModelStatus;
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  onLoadModel: () => void;
  onUnloadModel: () => void;
}

export const HardwareInspector: React.FC<HardwareInspectorProps> = ({
  hardware,
  modelStatus,
  selectedModelId,
  onSelectModel,
  onLoadModel,
  onUnloadModel,
}) => {
  const [presetId, setPresetId] = useState<string>('detected');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'MLC-WebGPU' | 'GGUF'>('ALL');

  const activeBudget = useMemo(() => {
    if (presetId === 'detected' && hardware) {
      return {
        label: 'This Device (Live)',
        webgpuSupported: hardware.webgpuSupported,
        estimatedVramGB: hardware.estimatedVramGB,
        deviceMemoryGB: hardware.deviceMemoryGB,
        hardwareConcurrency: hardware.hardwareConcurrency,
      };
    }
    const preset = HARDWARE_PRESETS.find((p) => p.id === presetId) ?? HARDWARE_PRESETS[2];
    return {
      label: preset.label,
      webgpuSupported: preset.webgpuSupported,
      estimatedVramGB: preset.estimatedVramGB,
      deviceMemoryGB: preset.deviceMemoryGB,
      hardwareConcurrency: preset.hardwareConcurrency,
    };
  }, [presetId, hardware]);

  const filteredModels = useMemo(() => {
    return MODEL_CATALOG.filter((m) => {
      if (formatFilter === 'ALL') return true;
      if (formatFilter === 'MLC-WebGPU') return m.format === 'MLC-WebGPU';
      return m.format.startsWith('GGUF');
    });
  }, [formatFilter]);

  const webgpuModels = useMemo(() => MODEL_CATALOG.filter((m) => m.webllmCapable), []);

  return (
    <div className="space-y-6">
      {/* Device Telemetry Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel-surface rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-mono text-[11px] uppercase tracking-wider">WebGPU Adapter</span>
            <Cpu className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-lg font-bold text-slate-50">
            {hardware?.webgpuSupported ? 'WebGPU Active' : 'CPU Fallback Mode'}
          </p>
          <p className="mt-1 truncate font-mono text-xs text-slate-400">
            {hardware ? `${hardware.adapterVendor} · ${hardware.adapterArchitecture}` : 'Probing browser adapter...'}
          </p>
        </div>

        <div className="panel-surface rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-mono text-[11px] uppercase tracking-wider">Est. VRAM / Buffer</span>
            <HardDrive className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-lg font-bold text-slate-50">
            {hardware
              ? hardware.webgpuSupported
                ? `~${hardware.estimatedVramGB} GB`
                : '0 GB GPU'
              : '—'}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-400">
            Max buffer: {hardware?.maxBufferSizeMB ? `${hardware.maxBufferSizeMB} MB` : 'N/A (deterministic engine)'}
          </p>
        </div>

        <div className="panel-surface rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-mono text-[11px] uppercase tracking-wider">System RAM &amp; Threads</span>
            <MemoryStick className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-lg font-bold text-slate-50">
            {hardware?.deviceMemoryGB ? `${hardware.deviceMemoryGB} GB RAM` : 'RAM Private'} ·{' '}
            {hardware?.hardwareConcurrency ?? 4} Threads
          </p>
          <p className="mt-1 font-mono text-xs text-slate-400">
            Platform: {hardware?.platform ?? 'Browser sandbox'}
          </p>
        </div>

        <div className="panel-surface rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-mono text-[11px] uppercase tracking-wider">Active Runtime</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-lg font-bold text-emerald-300">
            {modelStatus.status === 'ready' ? 'WebGPU MLC Loaded' : 'Local Deterministic'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Zero remote API keys · offline capable
          </p>
        </div>
      </section>

      {/* Capability Explanation + Optional WebGPU Model Loader */}
      <section className="panel-surface rounded-2xl p-4 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="flex items-start gap-2">
              <Gauge className="mt-1 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-slate-100">
                On-Device WebGPU Model Runtime (Optional)
              </h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
              {hardware?.detectionNotes ??
                'Inspecting device WebGPU capabilities and system memory.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-mono text-emerald-300">
                Zero Paywalls
              </span>
              <span className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 font-mono text-cyan-200">
                Lazy-Loaded WebLLM Chunk
              </span>
              <span className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-slate-300">
                IndexedDB Weight Cache
              </span>
            </div>
          </div>

          <div className="panel-inset rounded-xl p-4">
            <label htmlFor="webgpu-model-select" className="block font-mono text-[11px] uppercase tracking-wider text-slate-400">
              Select MLC-WebGPU Model
            </label>
            <select
              id="webgpu-model-select"
              value={selectedModelId}
              onChange={(e) => onSelectModel(e.target.value)}
              disabled={modelStatus.status === 'loading'}
              className="mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-700/80 bg-[#10141d] px-3 text-xs text-slate-100"
            >
              {webgpuModels.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#10141d]">
                  {m.name} (~{m.vramRequiredGB} GB VRAM)
                </option>
              ))}
            </select>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {modelStatus.status === 'ready' ? (
                <button
                  type="button"
                  onClick={onUnloadModel}
                  className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
                >
                  <Power className="h-4 w-4" aria-hidden="true" />
                  <span>Unload VRAM Weights</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLoadModel}
                  disabled={!hardware?.webgpuSupported || modelStatus.status === 'loading'}
                  className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {modelStatus.status === 'loading'
                      ? 'Downloading Weights...'
                      : hardware?.webgpuSupported
                      ? 'Initialize WebGPU Model'
                      : 'WebGPU Unavailable (Local Engine Active)'}
                  </span>
                </button>
              )}
            </div>

            {modelStatus.status === 'loading' && (
              <div className="mt-3 space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-cyan-400 transition-all"
                    style={{ width: `${Math.max(5, Math.round(modelStatus.progress * 100))}%` }}
                  />
                </div>
                <p className="font-mono text-[11px] text-cyan-300">{modelStatus.message}</p>
              </div>
            )}

            {modelStatus.status === 'ready' && (
              <p className="mt-2.5 flex items-center gap-1.5 font-mono text-[11px] text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Loaded: {modelStatus.loadedModelId}
              </p>
            )}

            {modelStatus.status === 'error' && (
              <p className="mt-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">
                {modelStatus.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Model VRAM Fit Matrix */}
      <section className="panel-surface rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-start gap-2">
              <SlidersHorizontal className="mt-1 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-slate-100">
                Quantized Model VRAM Fit Inspector (MLC &amp; GGUF)
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Evaluate model footprints against live hardware or simulate target edge devices.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'MLC-WebGPU', 'GGUF'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormatFilter(fmt)}
                className={cn(
                  'min-h-[36px] rounded-lg border px-3 py-1 font-mono text-xs transition-colors',
                  formatFilter === fmt
                    ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-800 bg-[#0b0e15] text-slate-400 hover:text-slate-200'
                )}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Target Device Presets */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
            Target Budget:
          </span>
          {HARDWARE_PRESETS.map((preset) => {
            const selected = presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setPresetId(preset.id)}
                className={cn(
                  'min-h-[38px] rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
                  selected
                    ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'
                    : 'border-slate-800 bg-[#0b0e15] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Fit Cards Grid (Responsive, zero table overflow on mobile) */}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {filteredModels.map((model) => {
            const fit = evaluateModelFit(model, activeBudget);
            const badgeStyle =
              fit.status === 'fits'
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                : fit.status === 'tight'
                ? 'border-amber-500/35 bg-amber-500/10 text-amber-300'
                : fit.status === 'cpu-only'
                ? 'border-slate-600 bg-slate-800 text-slate-300'
                : 'border-rose-500/35 bg-rose-500/10 text-rose-300';

            const barStyle =
              fit.status === 'fits'
                ? 'bg-emerald-400'
                : fit.status === 'tight'
                ? 'bg-amber-400'
                : fit.status === 'cpu-only'
                ? 'bg-slate-600'
                : 'bg-rose-400';

            return (
              <article key={model.id} className="panel-inset rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-sm font-semibold text-slate-100">
                      {model.name}
                    </h3>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                      {model.format} · {model.quant} · {model.paramsB}B · {(model.contextLength / 1024).toFixed(0)}k ctx
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase',
                      badgeStyle
                    )}
                  >
                    {fit.status === 'cpu-only' ? 'Needs WebGPU' : fit.status}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-400">{model.description}</p>

                <div className="mt-3">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-slate-300">
                      Req: <strong className="text-slate-100">{model.vramRequiredGB} GB</strong> VRAM
                    </span>
                    <span className="text-slate-400">
                      {fit.status === 'cpu-only' ? 'No GPU budget' : `${Math.min(999, fit.utilizationPct)}% of budget`}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={cn('h-full rounded-full transition-all', barStyle)}
                      style={{ width: `${Math.min(100, Math.max(fit.status === 'cpu-only' ? 0 : 8, fit.utilizationPct))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">{fit.reason}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
