export interface Skill {
  id: string;
  name: string;
  description: string;
  code: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  toolCall?: {
    name: string;
    args: any;
  };
}

export interface ModelStatus {
  status: "idle" | "loading" | "ready" | "error";
  progress: number;
  message: string;
}
