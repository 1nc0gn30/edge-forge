import { DEFAULT_SKILLS } from '../engine/localSkills';
import { DEFAULT_WORKFLOWS } from '../engine/workflowRunner';
import { SkillDefinition, WorkflowDefinition } from '../types';

const WORKFLOWS_KEY = 'edge-forge:workflows:v2';
const SKILLS_KEY = 'edge-forge:skills:v2';

function safeStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function loadWorkflows(): WorkflowDefinition[] {
  const storage = safeStorage();
  if (!storage) return DEFAULT_WORKFLOWS;
  try {
    const raw = storage.getItem(WORKFLOWS_KEY);
    if (!raw) return DEFAULT_WORKFLOWS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as WorkflowDefinition[];
    }
  } catch {
    return DEFAULT_WORKFLOWS;
  }
  return DEFAULT_WORKFLOWS;
}

export function saveWorkflows(workflows: WorkflowDefinition[]): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows));
  } catch {
    // Ignore storage quota / private mode failures
  }
}

export function loadSkills(): SkillDefinition[] {
  const storage = safeStorage();
  if (!storage) return DEFAULT_SKILLS;
  try {
    const raw = storage.getItem(SKILLS_KEY);
    if (!raw) return DEFAULT_SKILLS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as SkillDefinition[];
    }
  } catch {
    return DEFAULT_SKILLS;
  }
  return DEFAULT_SKILLS;
}

export function saveSkills(skills: SkillDefinition[]): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(SKILLS_KEY, JSON.stringify(skills));
  } catch {
    // Ignore storage quota / private mode failures
  }
}

export function resetWorkspaceStorage(): { workflows: WorkflowDefinition[]; skills: SkillDefinition[] } {
  const storage = safeStorage();
  try {
    storage?.removeItem(WORKFLOWS_KEY);
    storage?.removeItem(SKILLS_KEY);
  } catch {
    // Ignore
  }
  return {
    workflows: DEFAULT_WORKFLOWS,
    skills: DEFAULT_SKILLS,
  };
}
