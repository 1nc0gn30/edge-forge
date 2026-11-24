import { MODEL_CATALOG } from '../engine/hardwareInspector';
import { ModelSpec } from '../types';

type WebLLMModule = typeof import('@mlc-ai/web-llm');
type MLCEngineInstance = InstanceType<WebLLMModule['MLCEngine']>;

export class WebLLMService {
  private engine: MLCEngineInstance | null = null;
  private loadedModelId: string | null = null;
  private onProgress: (progress: number, message: string) => void = () => {};

  getWebGpuModels(): ModelSpec[] {
    return MODEL_CATALOG.filter((m) => m.webllmCapable);
  }

  isLoaded(): boolean {
    return this.engine !== null && this.loadedModelId !== null;
  }

  getLoadedModelId(): string | null {
    return this.loadedModelId;
  }

  async checkWebGPUSupport(): Promise<boolean> {
    if (typeof navigator === 'undefined') return false;
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    if (!gpu || typeof gpu.requestAdapter !== 'function') return false;
    try {
      const adapter = await gpu.requestAdapter();
      return Boolean(adapter);
    } catch {
      return false;
    }
  }

  setProgressListener(callback: (progress: number, message: string) => void) {
    this.onProgress = callback;
  }

  async loadModel(modelId: string = 'SmolLM2-360M-Instruct-q4f16_1-MLC'): Promise<void> {
    const gpuSupported = await this.checkWebGPUSupport();
    if (!gpuSupported) {
      throw new Error(
        'WebGPU adapter unavailable in this browser. Edge-Forge remains fully functional using the Local Deterministic Engine.'
      );
    }

    this.onProgress(0.05, 'Loading WebLLM runtime chunk...');
    const webllm = await import('@mlc-ai/web-llm');
    const engine = new webllm.MLCEngine();
    engine.setInitProgressCallback((report) => {
      this.onProgress(report.progress, report.text);
    });

    await engine.reload(modelId);
    this.engine = engine;
    this.loadedModelId = modelId;
    this.onProgress(1, `Loaded ${modelId} into WebGPU VRAM`);
  }

  async generateSinglePass(prompt: string, systemPrompt: string): Promise<string | null> {
    if (!this.engine) return null;

    const completion = await this.engine.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 512,
      stream: false,
    });

    return completion.choices[0]?.message?.content ?? '';
  }

  async unload(): Promise<void> {
    if (this.engine && typeof this.engine.unload === 'function') {
      await this.engine.unload();
    }
    this.engine = null;
    this.loadedModelId = null;
  }
}

export const webllmService = new WebLLMService();
