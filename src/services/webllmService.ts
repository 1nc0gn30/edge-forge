import * as webllm from "@mlc-ai/web-llm";
import { Skill } from "../types";

export class WebLLMService {
  private engine: webllm.MLCEngine | null = null;
  private onProgress: (progress: number, message: string) => void = () => {};

  getPrebuiltModels() {
    return webllm.prebuiltAppConfig.model_list
      .filter(m => !m.model_id.toLowerCase().includes('embed'))
      .map(m => ({
        id: m.model_id,
        name: m.model_id.split('-').slice(0, 3).join(' '),
        vram: m.vram_required_MB ? `~${Math.round(m.vram_required_MB / 1024 * 10) / 10}GB VRAM` : 'Unknown'
      }));
  }

  async checkWebGPUSupport(): Promise<boolean> {
    if (!(navigator as any).gpu) return false;
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      return !!adapter;
    } catch (e) {
      return false;
    }
  }

  setProgressListener(callback: (progress: number, message: string) => void) {
    this.onProgress = callback;
  }

  async loadModel(modelId: string = "Gemma-2-2b-it-q4f16_1-MLC") {
    try {
      const gpuSupported = await this.checkWebGPUSupport();
      if (!gpuSupported) {
        throw new Error("WebGPU is not supported or enabled in your browser. Please use Chrome/Edge/Arc and ensure WebGPU is enabled in flags if necessary.");
      }

      this.engine = new webllm.MLCEngine();
      this.engine.setInitProgressCallback((report: webllm.InitProgressReport) => {
        this.onProgress(report.progress, report.text);
      });

      await this.engine.reload(modelId);
    } catch (error: any) {
      console.error("WebLLM Load Error:", error);
      throw new Error(error.message || "Failed to load model. This could be due to insufficient VRAM, network issues, or browser compatibility.");
    }
  }

  async generate(
    messages: any[],
    skills: Skill[],
    onUpdate: (text: string) => void
  ) {
    if (!this.engine) throw new Error("Engine not initialized");

    // Convert skills to web-llm tools format if supported, 
    // or inject into system prompt for now as a fallback if the specific model variant doesn't support native tool calling well in web-llm yet.
    // For Gemma 4 / Gemma 2, we can try native tool calling.

    const tools: webllm.ChatCompletionTool[] = skills.map(skill => ({
      type: "function",
      function: {
        name: skill.name,
        description: skill.description,
        parameters: skill.parameters,
      },
    }));

    const completion = await this.engine.chat.completions.create({
      messages,
      tools: tools.length > 0 ? tools : undefined,
      stream: true,
    });

    let fullText = "";
    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content || "";
      fullText += delta;
      onUpdate(fullText);
      
      // Handle tool calls
      const toolCalls = chunk.choices[0]?.delta?.tool_calls;
      if (toolCalls) {
        return { toolCalls };
      }
    }

    return { text: fullText };
  }

  async interrupt() {
    if (this.engine) {
      await this.engine.interruptGenerate();
    }
  }
}

export const webllmService = new WebLLMService();
