import React, { useCallback, useEffect, useState } from 'react';
import { Footer } from './components/Footer';
import { HardwareInspector } from './components/HardwareInspector';
import { Header, WorkspaceTab } from './components/Header';
import { PipelineWorkspace } from './components/PipelineWorkspace';
import { SkillStudio } from './components/SkillStudio';
import { detectHardwareProfile } from './engine/hardwareInspector';
import { runWorkflowPipeline } from './engine/workflowRunner';
import {
  loadSkills,
  loadWorkflows,
  resetWorkspaceStorage,
  saveSkills,
  saveWorkflows,
} from './lib/storage';
import { webllmService } from './services/webllmService';
import {
  ExecutionTrace,
  HardwareProfile,
  ModelStatus,
  SkillDefinition,
  WorkflowDefinition,
} from './types';

function getInitialTab(): WorkspaceTab {
  if (typeof window === 'undefined') return 'pipeline';
  const param = new URLSearchParams(window.location.search).get('tab');
  if (param === 'skills' || param === 'hardware') return param;
  return 'pipeline';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => getInitialTab());
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(() => loadWorkflows());
  const [skills, setSkills] = useState<SkillDefinition[]>(() => loadSkills());
  const [activeWorkflowId, setActiveWorkflowId] = useState<string>(() => loadWorkflows()[0]?.id ?? '');
  const [inputText, setInputText] = useState<string>(() => loadWorkflows()[0]?.inputSample ?? '');

  const [hardware, setHardware] = useState<HardwareProfile | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('SmolLM2-360M-Instruct-q4f16_1-MLC');
  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [trace, setTrace] = useState<ExecutionTrace | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const activeWorkflow = workflows.find((w) => w.id === activeWorkflowId) ?? workflows[0];

  // Persist workflows & skills cleanly to localStorage
  useEffect(() => {
    saveWorkflows(workflows);
  }, [workflows]);

  useEffect(() => {
    saveSkills(skills);
  }, [skills]);

  // Detect WebGPU / device hardware cleanly with zero console errors
  useEffect(() => {
    let mounted = true;
    detectHardwareProfile().then((profile) => {
      if (mounted) setHardware(profile);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const executeActiveWorkflow = useCallback(
    async (wf: WorkflowDefinition | undefined, payload: string, currentSkills: SkillDefinition[]) => {
      if (!wf) return;
      setIsRunning(true);
      try {
        const result = await runWorkflowPipeline(wf, payload, currentSkills, {
          webgpuGenerate: webllmService.isLoaded()
            ? (prompt, systemPrompt) => webllmService.generateSinglePass(prompt, systemPrompt)
            : undefined,
        });
        setTrace(result);
      } finally {
        setIsRunning(false);
      }
    },
    []
  );

  // Run initial preset once on mount so the workstation opens directly into a live trace
  useEffect(() => {
    if (activeWorkflow && !trace) {
      void executeActiveWorkflow(activeWorkflow, inputText, skills);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectWorkflow = (id: string) => {
    const next = workflows.find((w) => w.id === id);
    if (!next) return;
    setActiveWorkflowId(next.id);
    setInputText(next.inputSample);
    void executeActiveWorkflow(next, next.inputSample, skills);
  };

  const handleUpdateWorkflow = (updated: WorkflowDefinition) => {
    setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  };

  const handleCreateWorkflow = () => {
    const newWf: WorkflowDefinition = {
      id: `wf-custom-${Date.now().toString(36)}`,
      name: `Custom Pipeline ${workflows.length + 1}`,
      description: 'Custom local workflow chain. Add nodes below and execute directly in your browser.',
      inputSample: 'service=api-edge region=us-east status=200 latency_ms=18\nservice=worker region=us-west status=500 latency_ms=890',
      nodes: [
        {
          id: `node-${Date.now().toString(36)}-1`,
          title: 'Extract Structured JSON',
          kind: 'extract_json',
          enabled: true,
          config: { fallbackKeyValues: true },
        },
        {
          id: `node-${Date.now().toString(36)}-2`,
          title: 'Lint & Sort JSON',
          kind: 'lint_json',
          enabled: true,
          config: { sortKeys: true, indent: 2 },
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    setWorkflows((prev) => [newWf, ...prev]);
    setActiveWorkflowId(newWf.id);
    setInputText(newWf.inputSample);
    void executeActiveWorkflow(newWf, newWf.inputSample, skills);
  };

  const handleImportWorkflow = (imported: WorkflowDefinition) => {
    setWorkflows((prev) => [imported, ...prev]);
    setActiveWorkflowId(imported.id);
    setInputText(imported.inputSample);
    void executeActiveWorkflow(imported, imported.inputSample, skills);
  };

  const handleResetDefaults = () => {
    const fresh = resetWorkspaceStorage();
    setWorkflows(fresh.workflows);
    setSkills(fresh.skills);
    setActiveWorkflowId(fresh.workflows[0].id);
    setInputText(fresh.workflows[0].inputSample);
    void executeActiveWorkflow(fresh.workflows[0], fresh.workflows[0].inputSample, fresh.skills);
  };

  const handleSaveSkill = (updated: SkillDefinition) => {
    setSkills((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleCreateSkill = (): SkillDefinition => {
    const created: SkillDefinition = {
      id: `skill-${Date.now().toString(36)}`,
      name: `custom_skill_${skills.length + 1}`,
      category: 'Prompt',
      description: 'Reusable local prompt envelope.',
      mode: 'template',
      template: '### LOCAL PROMPT ({{word_count}} words)\n{{input}}',
      testInput: 'Sample local input text for testing.',
      updatedAt: new Date().toISOString(),
    };
    setSkills((prev) => [created, ...prev]);
    return created;
  };

  const handleDeleteSkill = (id: string) => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAttachSkillToPipeline = (skill: SkillDefinition) => {
    if (!activeWorkflow) return;
    const updated: WorkflowDefinition = {
      ...activeWorkflow,
      nodes: [
        ...activeWorkflow.nodes,
        {
          id: `node-skill-${Date.now().toString(36)}`,
          title: `Skill: ${skill.name}`,
          kind: 'custom_skill',
          enabled: true,
          skillId: skill.id,
          config: {},
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    handleUpdateWorkflow(updated);
    setActiveTab('pipeline');
    void executeActiveWorkflow(updated, inputText, skills);
  };

  const handleLoadWebGpuModel = async () => {
    setModelStatus({ status: 'loading', progress: 0.05, message: 'Preparing WebGPU engine...' });
    webllmService.setProgressListener((progress, message) => {
      setModelStatus({ status: 'loading', progress, message });
    });
    try {
      await webllmService.loadModel(selectedModelId);
      setModelStatus({
        status: 'ready',
        progress: 1,
        message: 'Ready',
        loadedModelId: selectedModelId,
      });
    } catch (err) {
      setModelStatus({
        status: 'error',
        progress: 0,
        message: err instanceof Error ? err.message : 'Unable to load WebGPU model.',
      });
    }
  };

  const handleUnloadWebGpuModel = async () => {
    await webllmService.unload();
    setModelStatus({ status: 'idle', progress: 0, message: '' });
  };

  return (
    <div className="telemetry-grid flex min-h-screen flex-col bg-[#090b10] text-slate-100 selection:bg-cyan-500/30">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hardware={hardware}
        modelStatus={modelStatus}
        onQuickRun={() => {
          setActiveTab('pipeline');
          void executeActiveWorkflow(activeWorkflow, inputText, skills);
        }}
        isRunning={isRunning}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">
        {activeTab === 'pipeline' && (
          <PipelineWorkspace
            workflows={workflows}
            activeWorkflowId={activeWorkflow?.id ?? ''}
            onSelectWorkflow={handleSelectWorkflow}
            onUpdateWorkflow={handleUpdateWorkflow}
            onCreateWorkflow={handleCreateWorkflow}
            onImportWorkflow={handleImportWorkflow}
            onResetDefaults={handleResetDefaults}
            inputText={inputText}
            onInputChange={setInputText}
            skills={skills}
            trace={trace}
            isRunning={isRunning}
            onRunPipeline={() => void executeActiveWorkflow(activeWorkflow, inputText, skills)}
            webgpuLoadedModel={modelStatus.status === 'ready' ? modelStatus.loadedModelId ?? null : null}
          />
        )}

        {activeTab === 'skills' && (
          <SkillStudio
            skills={skills}
            onSaveSkill={handleSaveSkill}
            onCreateSkill={handleCreateSkill}
            onDeleteSkill={handleDeleteSkill}
            onAttachSkillToPipeline={handleAttachSkillToPipeline}
          />
        )}

        {activeTab === 'hardware' && (
          <HardwareInspector
            hardware={hardware}
            modelStatus={modelStatus}
            selectedModelId={selectedModelId}
            onSelectModel={setSelectedModelId}
            onLoadModel={() => void handleLoadWebGpuModel()}
            onUnloadModel={() => void handleUnloadWebGpuModel()}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
