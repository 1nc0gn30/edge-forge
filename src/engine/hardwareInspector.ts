import { HardwareProfile, ModelFitAssessment, ModelSpec } from '../types';

export const MODEL_CATALOG: ModelSpec[] = [
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 360M Instruct',
    family: 'SmolLM2',
    quant: 'q4f16_1',
    paramsB: 0.36,
    vramRequiredGB: 0.45,
    ramRequiredGB: 1.0,
    contextLength: 8192,
    format: 'MLC-WebGPU',
    webllmCapable: true,
    description: 'Ultra-lightweight classification, tagging, and quick formatting on phones and laptops.',
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 0.5B Instruct',
    family: 'Qwen2.5',
    quant: 'q4f16_1',
    paramsB: 0.5,
    vramRequiredGB: 0.95,
    ramRequiredGB: 1.5,
    contextLength: 32768,
    format: 'MLC-WebGPU',
    webllmCapable: true,
    description: 'Fast JSON extraction and multilingual edge tasks with minimal VRAM overhead.',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B Instruct',
    family: 'Llama 3.2',
    quant: 'q4f16_1',
    paramsB: 1.2,
    vramRequiredGB: 1.15,
    ramRequiredGB: 2.0,
    contextLength: 8192,
    format: 'MLC-WebGPU',
    webllmCapable: true,
    description: 'Balanced edge reasoning for document summarization and local tool routing.',
  },
  {
    id: 'Gemma-2-2b-it-q4f16_1-MLC',
    name: 'Gemma 2 2B IT',
    family: 'Gemma 2',
    quant: 'q4f16_1',
    paramsB: 2.6,
    vramRequiredGB: 1.9,
    ramRequiredGB: 4.0,
    contextLength: 8192,
    format: 'MLC-WebGPU',
    webllmCapable: true,
    description: 'Strong instruction following and structured output generation on integrated GPUs.',
  },
  {
    id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 3B Instruct',
    family: 'Qwen2.5',
    quant: 'q4f16_1',
    paramsB: 3.1,
    vramRequiredGB: 2.6,
    ramRequiredGB: 5.0,
    contextLength: 32768,
    format: 'MLC-WebGPU',
    webllmCapable: true,
    description: 'High-accuracy code analysis, schema extraction, and multi-step prompt templates.',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Mini Instruct',
    family: 'Phi 3.5',
    quant: 'q4f16_1',
    paramsB: 3.8,
    vramRequiredGB: 3.1,
    ramRequiredGB: 6.0,
    contextLength: 4096,
    format: 'MLC-WebGPU',
    webllmCapable: true,
    description: 'Dense reasoning model tuned for synthetic logic, math, and technical QA.',
  },
  {
    id: 'Llama-3.1-8B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.1 8B Instruct',
    family: 'Llama 3.1',
    quant: 'q4f16_1',
    paramsB: 8.0,
    vramRequiredGB: 5.2,
    ramRequiredGB: 10.0,
    contextLength: 8192,
    format: 'MLC-WebGPU',
    webllmCapable: true,
    description: 'Workstation-grade local inference for complex pipelines on discrete or Apple Silicon GPUs.',
  },
  {
    id: 'Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
    name: 'Mistral 7B v0.3 (GGUF Q4_K_M)',
    family: 'Mistral',
    quant: 'Q4_K_M',
    paramsB: 7.2,
    vramRequiredGB: 4.8,
    ramRequiredGB: 8.5,
    contextLength: 32768,
    format: 'GGUF-Q4',
    webllmCapable: false,
    description: 'Reference GGUF footprint for llama.cpp / Ollama local parity planning.',
  },
  {
    id: 'Qwen2.5-14B-Instruct-Q4_K_M.gguf',
    name: 'Qwen 2.5 14B (GGUF Q4_K_M)',
    family: 'Qwen2.5',
    quant: 'Q4_K_M',
    paramsB: 14.7,
    vramRequiredGB: 9.6,
    ramRequiredGB: 16.0,
    contextLength: 32768,
    format: 'GGUF-Q4',
    webllmCapable: false,
    description: 'High-capacity local reasoning target for 16GB–24GB VRAM workstations.',
  },
  {
    id: 'Llama-3.1-8B-Instruct-Q8_0.gguf',
    name: 'Llama 3.1 8B (GGUF Q8_0)',
    family: 'Llama 3.1',
    quant: 'Q8_0',
    paramsB: 8.0,
    vramRequiredGB: 8.9,
    ramRequiredGB: 14.0,
    contextLength: 8192,
    format: 'GGUF-Q8',
    webllmCapable: false,
    description: 'Near-lossless 8-bit quantization benchmark for high-VRAM edge rigs.',
  },
];

export interface HardwareTargetPreset {
  id: string;
  label: string;
  webgpuSupported: boolean;
  estimatedVramGB: number;
  deviceMemoryGB: number;
  hardwareConcurrency: number;
  description: string;
}

export const HARDWARE_PRESETS: HardwareTargetPreset[] = [
  {
    id: 'detected',
    label: 'This Device',
    webgpuSupported: false,
    estimatedVramGB: 0,
    deviceMemoryGB: 8,
    hardwareConcurrency: 4,
    description: 'Live telemetry detected directly from your browser.',
  },
  {
    id: 'mobile-4gb',
    label: '4 GB Edge Mobile',
    webgpuSupported: true,
    estimatedVramGB: 1.5,
    deviceMemoryGB: 4,
    hardwareConcurrency: 6,
    description: 'Modern mobile browser with ~1.5 GB usable WebGPU budget.',
  },
  {
    id: 'laptop-8gb',
    label: '8 GB Ultrabook',
    webgpuSupported: true,
    estimatedVramGB: 3.5,
    deviceMemoryGB: 8,
    hardwareConcurrency: 8,
    description: 'Integrated GPU laptop with unified memory budget.',
  },
  {
    id: 'workstation-16gb',
    label: '16 GB Workstation',
    webgpuSupported: true,
    estimatedVramGB: 8.0,
    deviceMemoryGB: 16,
    hardwareConcurrency: 12,
    description: 'Apple Silicon / mid-range discrete GPU workstation.',
  },
  {
    id: 'gpu-24gb',
    label: '24 GB GPU Rig',
    webgpuSupported: true,
    estimatedVramGB: 20.0,
    deviceMemoryGB: 32,
    hardwareConcurrency: 16,
    description: 'Dedicated high-VRAM desktop GPU rig.',
  },
];

interface NavigatorWithExtras extends Navigator {
  gpu?: {
    requestAdapter: () => Promise<{
      info?: { vendor?: string; architecture?: string; description?: string; device?: string };
      requestAdapterInfo?: () => Promise<{ vendor?: string; architecture?: string; description?: string; device?: string }>;
      limits?: {
        maxBufferSize?: number;
        maxStorageBufferBindingSize?: number;
      };
    } | null>;
  };
  deviceMemory?: number;
}

export async function detectHardwareProfile(): Promise<HardwareProfile> {
  const nav = (typeof navigator !== 'undefined' ? navigator : undefined) as NavigatorWithExtras | undefined;
  const deviceMemoryGB = typeof nav?.deviceMemory === 'number' && nav.deviceMemory > 0 ? nav.deviceMemory : null;
  const hardwareConcurrency = typeof nav?.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 ? nav.hardwareConcurrency : 4;
  const platform = nav?.platform || 'Unknown Platform';

  const fallbackProfile: HardwareProfile = {
    webgpuSupported: false,
    adapterVendor: 'Unavailable',
    adapterArchitecture: 'CPU Fallback',
    adapterDescription: 'No active WebGPU adapter detected in this browser context',
    maxBufferSizeMB: null,
    maxStorageBufferBindingSizeMB: null,
    estimatedVramGB: deviceMemoryGB ? Math.max(0.5, Number((deviceMemoryGB * 0.25).toFixed(1))) : 0,
    deviceMemoryGB,
    hardwareConcurrency,
    platform,
    recommendedEngine: 'local-deterministic',
    detectionNotes:
      'Local Deterministic Engine is active. All pipeline transforms, regex/JSON extraction, chunking, summarization, and custom skills run offline with zero WebGPU dependency.',
  };

  if (!nav?.gpu || typeof nav.gpu.requestAdapter !== 'function') {
    return fallbackProfile;
  }

  try {
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) {
      return fallbackProfile;
    }

    let info = adapter.info;
    if (!info && typeof adapter.requestAdapterInfo === 'function') {
      try {
        info = await adapter.requestAdapterInfo();
      } catch {
        info = undefined;
      }
    }

    const maxBufferBytes = adapter.limits?.maxBufferSize ?? 0;
    const maxStorageBytes = adapter.limits?.maxStorageBufferBindingSize ?? 0;
    const maxBufferSizeMB = maxBufferBytes > 0 ? Math.round(maxBufferBytes / (1024 * 1024)) : null;
    const maxStorageBufferBindingSizeMB = maxStorageBytes > 0 ? Math.round(maxStorageBytes / (1024 * 1024)) : null;

    // Conservative usable browser WebGPU VRAM heuristic combining maxBufferSize and deviceMemory.
    const bufferEstimateGB = maxBufferSizeMB ? Math.min(24, (maxBufferSizeMB / 1024) * 3.5) : 2.0;
    const memEstimateGB = deviceMemoryGB ? deviceMemoryGB * 0.55 : bufferEstimateGB;
    const estimatedVramGB = Number(Math.max(1.0, Math.min(24, Math.max(bufferEstimateGB, memEstimateGB))).toFixed(1));

    return {
      webgpuSupported: true,
      adapterVendor: info?.vendor || 'WebGPU Adapter',
      adapterArchitecture: info?.architecture || 'GPU Shader Core',
      adapterDescription: info?.description || info?.device || 'Browser WebGPU hardware adapter',
      maxBufferSizeMB,
      maxStorageBufferBindingSizeMB,
      estimatedVramGB,
      deviceMemoryGB,
      hardwareConcurrency,
      platform,
      recommendedEngine: 'webgpu-mlc',
      detectionNotes:
        'WebGPU adapter detected. You can run both zero-latency deterministic pipelines and optional on-device MLC neural weights.',
    };
  } catch {
    return fallbackProfile;
  }
}

export function evaluateModelFit(
  model: ModelSpec,
  budget: { webgpuSupported: boolean; estimatedVramGB: number; deviceMemoryGB: number | null }
): ModelFitAssessment {
  if (!budget.webgpuSupported && model.format === 'MLC-WebGPU') {
    return {
      status: 'cpu-only',
      utilizationPct: 0,
      headroomGB: 0,
      reason: 'Requires WebGPU adapter. Use Local Deterministic Engine or run GGUF via native CPU runtime.',
    };
  }

  const effectiveBudgetGB = Math.max(0.25, budget.estimatedVramGB || (budget.deviceMemoryGB ? budget.deviceMemoryGB * 0.45 : 2));
  const utilizationPct = Math.round((model.vramRequiredGB / effectiveBudgetGB) * 100);
  const headroomGB = Number((effectiveBudgetGB - model.vramRequiredGB).toFixed(2));

  if (utilizationPct <= 75) {
    return {
      status: 'fits',
      utilizationPct,
      headroomGB,
      reason: `Comfortable fit (~${headroomGB} GB headroom for KV cache).`,
    };
  }

  if (utilizationPct <= 100) {
    return {
      status: 'tight',
      utilizationPct,
      headroomGB,
      reason: `Tight VRAM fit (${utilizationPct}%). Keep context window short to avoid OOM.`,
    };
  }

  return {
    status: 'exceeds',
    utilizationPct,
    headroomGB,
    reason: `Exceeds estimated ${effectiveBudgetGB.toFixed(1)} GB budget by ${Math.abs(headroomGB).toFixed(2)} GB.`,
  };
}
