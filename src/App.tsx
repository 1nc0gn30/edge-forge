import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Zap, 
  Shield, 
  Code, 
  Plus, 
  Settings, 
  Download, 
  AlertCircle,
  Play,
  Trash2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Skill, Message, ModelStatus } from './types';
import { webllmService } from './services/webllmService';

// --- Components ---

const Header = ({ webGpuSupported, status, onToggleSidebar }: { 
  webGpuSupported: boolean | null, 
  status: ModelStatus,
  onToggleSidebar: () => void 
}) => (
  <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
    <div className="container mx-auto flex h-16 items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/70 lg:hidden"
        >
          <Settings className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)]">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">Edge-Forge</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 md:flex">
          <Shield className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-medium text-white/70">Local-First</span>
        </div>
        
        <div className={cn(
          "flex items-center gap-2 rounded-full px-2 py-1 text-[10px] font-medium transition-all sm:px-3 sm:text-xs",
          webGpuSupported === true ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
          webGpuSupported === false ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : 
          "bg-white/5 text-white/50 border border-white/10"
        )}>
          <Cpu className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">{webGpuSupported === true ? "WebGPU Ready" : webGpuSupported === false ? "WebGPU Missing" : "Checking..."}</span>
          <span className="xs:hidden">{webGpuSupported === true ? "Ready" : "Error"}</span>
        </div>
      </div>
    </div>
  </header>
);

const ModelLoader = ({ status, onStart, selectedModel, onModelChange, models }: { 
  status: ModelStatus, 
  onStart: () => void,
  selectedModel: string,
  onModelChange: (id: string) => void,
  models: { id: string, name: string, vram: string }[]
}) => (
  <div className="flex w-full max-w-lg flex-col items-center justify-center gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm sm:p-12">
    <div className="relative">
      <div className="absolute -inset-4 rounded-full bg-indigo-500/20 blur-2xl animate-pulse" />
      <Download className="relative h-12 w-12 text-indigo-400 sm:h-16 sm:w-16" />
    </div>
    
    <div className="space-y-2">
      <h2 className="text-xl font-bold text-white sm:text-2xl">Load Local AI</h2>
      <p className="max-w-xs text-xs text-white/50 sm:text-sm">
        Download and cache the model directly in your browser. 
        No external server required.
      </p>
    </div>

    {status.status === 'idle' || status.status === 'error' ? (
      <div className="flex w-full max-w-xs flex-col gap-4">
        <div className="space-y-1 text-left">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Select Model</label>
          <select 
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-indigo-500/50"
          >
            {models.map(m => (
              <option key={m.id} value={m.id} className="bg-[#121214]">
                {m.name} ({m.vram})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onStart}
          className="group relative flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3 font-semibold text-black transition-all hover:scale-105 active:scale-95"
        >
          <Play className="h-4 w-4 fill-current" />
          Initialize Model
        </button>

        {status.status === 'error' && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-left text-xs text-rose-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{status.message}</p>
          </div>
        )}
      </div>
    ) : (
      <div className="w-full max-w-md space-y-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div 
            className="h-full bg-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${status.progress * 100}%` }}
          />
        </div>
        <p className="text-xs font-mono text-indigo-300 animate-pulse">
          {status.message || "Preparing engine..."}
        </p>
      </div>
    )}
  </div>
);

const SkillCard = ({ skill, onRemove }: { skill: Skill, onRemove: (id: string) => void, key?: string }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="group relative flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Code className="h-4 w-4 text-indigo-400" />
        <h3 className="font-semibold text-white">{skill.name}</h3>
      </div>
      <button 
        onClick={() => onRemove(skill.id)}
        className="opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4 text-rose-400 hover:text-rose-300" />
      </button>
    </div>
    <p className="text-xs text-white/50 line-clamp-2">{skill.description}</p>
  </motion.div>
);

const MessageBubble = ({ message }: { message: Message, key?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      "flex w-full flex-col gap-1.5",
      message.role === 'user' ? "items-end" : "items-start"
    )}
  >
    <div className={cn(
      "max-w-[90%] rounded-2xl px-4 py-2.5 text-sm shadow-lg sm:max-w-[85%] sm:py-3",
      message.role === 'user' 
        ? "bg-indigo-600 text-white rounded-tr-none" 
        : message.role === 'tool'
        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono text-[11px] sm:text-xs"
        : "bg-white/10 text-white/90 rounded-tl-none border border-white/10"
    )}>
      {message.content}
    </div>
    {message.toolCall && (
      <div className="flex items-center gap-2 px-1 text-[9px] font-mono text-indigo-400 sm:text-[10px]">
        <Zap className="h-3 w-3" />
        Calling {message.toolCall.name}(...)
      </div>
    )}
  </motion.div>
);

const MVPOverview = ({
  waitlistEmail,
  waitlistStatus,
  onWaitlistEmailChange,
  onWaitlistSubmit
}: {
  waitlistEmail: string;
  waitlistStatus: 'idle' | 'submitting' | 'success' | 'error';
  onWaitlistEmailChange: (value: string) => void;
  onWaitlistSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) => (
  <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
      MVP Preview
    </p>
    <h2 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">
      Private AI tooling that runs on your device, not someone else&apos;s server.
    </h2>
    <p className="mt-4 max-w-xl text-sm text-white/70 sm:text-base">
      Edge-Forge exists for teams and builders who need AI assistance without giving up
      privacy, low-latency control, or custom task automation.
    </p>

    <div className="mt-6 grid gap-3 text-sm text-white/80 sm:grid-cols-3">
      <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="font-semibold text-white">Pain Point 1</p>
        <p className="mt-1 text-white/65">Cloud AI tools can expose sensitive prompts and output.</p>
      </article>
      <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="font-semibold text-white">Pain Point 2</p>
        <p className="mt-1 text-white/65">General chat apps don&apos;t execute your domain-specific skills.</p>
      </article>
      <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="font-semibold text-white">Pain Point 3</p>
        <p className="mt-1 text-white/65">Most local AI setups are too complex for non-experts.</p>
      </article>
    </div>

    <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <p className="text-sm font-semibold text-amber-200">
        Roadmap feature: shared skill marketplace + optional encrypted cloud sync.
      </p>
      <p className="mt-1 text-xs text-amber-100/80 sm:text-sm">
        That feature takes longer than this MVP release window. Join the waitlist to
        get early access when it lands.
      </p>
      <form
        name="waitlist"
        method="POST"
        data-netlify="true"
        onSubmit={onWaitlistSubmit}
        className="mt-3 flex flex-col gap-2 sm:flex-row"
      >
        <input type="hidden" name="form-name" value="waitlist" />
        <input type="text" name="bot-field" className="hidden" tabIndex={-1} autoComplete="off" />
        <label htmlFor="waitlist-email" className="sr-only">Email address</label>
        <input
          id="waitlist-email"
          type="email"
          name="email"
          required
          value={waitlistEmail}
          onChange={(event) => onWaitlistEmailChange(event.target.value)}
          placeholder="you@company.com"
          className="h-11 flex-1 rounded-xl border border-white/15 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-amber-300/70"
        />
        <button
          type="submit"
          disabled={waitlistStatus === 'submitting'}
          className="h-11 rounded-xl bg-amber-300 px-5 text-sm font-semibold text-black transition hover:bg-amber-200 disabled:opacity-70"
        >
          {waitlistStatus === 'submitting' ? 'Submitting...' : 'Join Waitlist'}
        </button>
      </form>
      {waitlistStatus === 'success' && (
        <p className="mt-2 text-xs text-emerald-300 sm:text-sm">You&apos;re on the waitlist. Thank you.</p>
      )}
      {waitlistStatus === 'error' && (
        <p className="mt-2 text-xs text-rose-300 sm:text-sm">
          Submission failed. Please retry or email hello@nealfrazier.tech.
        </p>
      )}
    </div>
  </section>
);

// --- Main App ---

export default function App() {
  const [webGpuSupported, setWebGpuSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState<ModelStatus>({ status: 'idle', progress: 0, message: '' });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [skills, setSkills] = useState<Skill[]>([
    {
      id: 'skill-1',
      name: 'get_time',
      description: 'Returns the current local time.',
      code: 'return new Date().toLocaleTimeString();',
      parameters: { type: 'object', properties: {}, required: [] }
    },
    {
      id: 'skill-2',
      name: 'calculate',
      description: 'Evaluates a mathematical expression.',
      code: 'return eval(args.expression);',
      parameters: { 
        type: 'object', 
        properties: { 
          expression: { type: 'string', description: 'The math expression to evaluate' } 
        }, 
        required: ['expression'] 
      }
    }
  ]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Open sidebar by default on large screens
    if (window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [newSkill, setNewSkill] = useState<Partial<Skill>>({
    name: '',
    description: '',
    code: 'return `Executed skill with args: ${JSON.stringify(args)}`',
    parameters: { type: 'object', properties: {}, required: [] }
  });

  const [MODELS] = useState(() => webllmService.getPrebuiltModels());
  const [selectedModel, setSelectedModel] = useState(() => {
    const models = webllmService.getPrebuiltModels();
    // Try to find a small model as default for mobile
    return models.find(m => m.id.toLowerCase().includes('smollm'))?.id || 
           models.find(m => m.id.toLowerCase().includes('gemma'))?.id || 
           models[0]?.id || "";
  });
  const selectedModelLabel = MODELS.find((m) => m.id === selectedModel)?.name || 'Selected model';

  useEffect(() => {
    webllmService.checkWebGPUSupport().then(setWebGpuSupported);
    
    // Default system message
    setMessages([{
      id: 'system-1',
      role: 'system',
      content: 'You are a local AI agent running directly on this device. You can use tools defined by the user to interact with the environment.',
      timestamp: Date.now()
    }]);
  }, []);

  const handleLoadModel = async () => {
    setStatus({ status: 'loading', progress: 0, message: 'Initializing engine...' });
    webllmService.setProgressListener((progress, message) => {
      setStatus(prev => ({ ...prev, progress, message }));
    });
    
    try {
      await webllmService.loadModel(selectedModel);
      setStatus({ status: 'ready', progress: 1, message: 'Ready' });
    } catch (error: any) {
      setStatus({ status: 'error', progress: 0, message: error.message });
      console.error(error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || status.status !== 'ready') return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const chatMessages = messages.concat(userMsg).map(m => ({
        role: m.role,
        content: m.content
      }));

      const result = await webllmService.generate(
        chatMessages,
        skills,
        (text) => {
          setMessages(prev => prev.map(m => 
            m.id === assistantMsg.id ? { ...m, content: text } : m
          ));
        }
      );

      if (result.toolCalls) {
        // Current runtime supports one pass of tool execution in-chat.
        for (const tc of result.toolCalls) {
          const skill = skills.find(s => s.name === tc.function.name);
          if (skill) {
            try {
              const args = JSON.parse(tc.function.arguments);
              // Execute the skill code
              const execute = new Function('args', skill.code);
              const toolResult = await execute(args);
              
              const toolMsg: Message = {
                id: Date.now().toString(),
                role: 'tool',
                content: String(toolResult),
                timestamp: Date.now()
              };
              setMessages(prev => [...prev, toolMsg]);
              
              // Continue generation with tool result
              // (In a full implementation, we'd call webllm again here)
            } catch (e) {
              console.error("Skill execution failed", e);
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const addSkill = () => {
    if (!newSkill.name) return;
    const skill: Skill = {
      id: Date.now().toString(),
      name: newSkill.name!,
      description: newSkill.description || '',
      code: newSkill.code || '',
      parameters: newSkill.parameters as any
    };
    setSkills(prev => [...prev, skill]);
    setShowSkillModal(false);
    setNewSkill({
      name: '',
      description: '',
      code: 'return `Executed skill with args: ${JSON.stringify(args)}`',
      parameters: { type: 'object', properties: {}, required: [] }
    });
  };

  const handleWaitlistSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWaitlistStatus('submitting');
    try {
      const payload = new URLSearchParams({
        "form-name": "waitlist",
        email: waitlistEmail,
        "bot-field": "",
      });

      const response = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload.toString(),
      });

      if (!response.ok) {
        throw new Error("Failed to submit");
      }

      setWaitlistStatus('success');
      setWaitlistEmail('');
    } catch (error) {
      console.error(error);
      setWaitlistStatus('error');
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0c] text-white selection:bg-indigo-500/30">
      <Header 
        webGpuSupported={webGpuSupported} 
        status={status} 
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
      />
      
      <main className="relative flex flex-1 overflow-hidden">
        {/* Sidebar Overlay (Mobile) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-white/10 bg-[#0a0a0c] shadow-2xl lg:relative lg:z-0 lg:w-80 lg:bg-black/20 lg:backdrop-blur-md"
            >
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-indigo-400" />
                  <h2 className="font-bold">Skills</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowSkillModal(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
                {skills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                    <div className="rounded-full bg-white/5 p-4">
                      <Zap className="h-8 w-8 text-white/20" />
                    </div>
                    <p className="text-sm text-white/40">No skills defined yet.<br/>Add a skill to extend AI capabilities.</p>
                  </div>
                ) : (
                  skills.map(skill => (
                    <SkillCard 
                      key={skill.id} 
                      skill={skill} 
                      onRemove={(id) => setSkills(prev => prev.filter(s => s.id !== id))} 
                    />
                  ))
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div className="relative flex flex-1 flex-col">
          {status.status !== 'ready' ? (
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 pb-8 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
                <MVPOverview
                  waitlistEmail={waitlistEmail}
                  waitlistStatus={waitlistStatus}
                  onWaitlistEmailChange={setWaitlistEmail}
                  onWaitlistSubmit={handleWaitlistSubmit}
                />
                <div className="flex items-start justify-center lg:items-stretch">
                  <ModelLoader 
                    status={status} 
                    onStart={handleLoadModel} 
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                    models={MODELS}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-24">
                  {messages.filter(m => m.role !== 'system').length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/70">
                      <p className="font-semibold text-white">Quick start</p>
                      <p className="mt-2">1) Load a model. 2) Ask a task. 3) Add skills for repeatable automation.</p>
                      <p className="mt-2 text-white/55">
                        Edge-Forge solves privacy, offline reliability, and customization gaps in cloud-only AI tools.
                      </p>
                    </div>
                  ) : (
                    messages.filter(m => m.role !== 'system').map(m => (
                      <MessageBubble key={m.id} message={m} />
                    ))
                  )}
                </div>
              </div>

              {/* Input Area */}
              <div className="sticky bottom-0 left-0 w-full bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c] to-transparent p-4 sm:p-6">
                <div className="mx-auto max-w-3xl">
                  <div className="relative flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 p-1.5 backdrop-blur-2xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 sm:p-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask your local AI..."
                      className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-white/30 sm:px-4"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:hover:bg-indigo-600"
                    >
                      <Zap className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[9px] text-white/30 sm:text-[10px]">
                    {selectedModelLabel} is running locally. Your data stays on this device.
                  </p>
                  <p className="mt-1 text-center text-[9px] text-amber-400/70 sm:text-[10px]">
                    Tool chaining is in beta and currently runs a single execution pass.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Skill Modal */}
      <AnimatePresence>
        {showSkillModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSkillModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#121214] p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">Create New Skill</h2>
                <button onClick={() => setShowSkillModal(false)}>
                  <X className="h-6 w-6 text-white/50 hover:text-white" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Skill Name</label>
                  <input 
                    type="text"
                    value={newSkill.name}
                    onChange={(e) => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., get_weather"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-indigo-500/50"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Description</label>
                  <textarea 
                    value={newSkill.description}
                    onChange={(e) => setNewSkill(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What does this skill do?"
                    className="h-20 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40">JavaScript Logic</label>
                  <div className="relative">
                    <textarea 
                      value={newSkill.code}
                      onChange={(e) => setNewSkill(prev => ({ ...prev, code: e.target.value }))}
                      className="h-32 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-indigo-300 outline-none focus:border-indigo-500/50"
                    />
                    <div className="absolute bottom-2 right-2 rounded bg-indigo-500/10 px-2 py-1 text-[10px] text-indigo-400">
                      args available
                    </div>
                  </div>
                </div>

                <button
                  onClick={addSkill}
                  className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white transition-all hover:bg-indigo-500"
                >
                  Save Skill
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
