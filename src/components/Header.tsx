import React from 'react';
import { Cpu, GitBranch, Play, ShieldCheck, Wrench, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { HardwareProfile, ModelStatus } from '../types';

export type WorkspaceTab = 'pipeline' | 'skills' | 'hardware';

interface HeaderProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  hardware: HardwareProfile | null;
  modelStatus: ModelStatus;
  onQuickRun: () => void;
  isRunning: boolean;
}

const TABS: { id: WorkspaceTab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'pipeline', label: 'Pipeline Builder', shortLabel: 'Pipeline', icon: GitBranch },
  { id: 'skills', label: 'Skill Studio', shortLabel: 'Skills', icon: Wrench },
  { id: 'hardware', label: 'Hardware & Models', shortLabel: 'Hardware', icon: Cpu },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  hardware,
  modelStatus,
  onQuickRun,
  isRunning,
}) => {
  const gpuLoaded = modelStatus.status === 'ready';
  const gpuReady = hardware?.webgpuSupported === true;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#090b10]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
            <Zap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-bold tracking-tight text-slate-50 sm:text-lg">
                Edge-Forge
              </h1>
              <span className="rounded border border-slate-700/80 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-cyan-300">
                v2.0
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              Private on-device AI workflow &amp; WebGPU workbench
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav
          aria-label="Workspace views"
          className="order-3 flex w-full items-center gap-1 rounded-xl border border-slate-800 bg-[#0d1119] p-1 md:order-2 md:w-auto"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors md:flex-initial md:text-sm',
                  active
                    ? 'bg-cyan-500/15 text-cyan-200 ring-1 ring-inset ring-cyan-400/35'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Runtime Status & Quick Run */}
        <div className="order-2 flex items-center gap-2 md:order-3">
          <button
            type="button"
            onClick={() => onTabChange('hardware')}
            title="Inspect hardware capabilities and WebGPU VRAM fit"
            className={cn(
              'hidden min-h-[40px] items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors sm:inline-flex',
              gpuLoaded
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15'
                : gpuReady
                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15'
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {gpuLoaded
                ? 'WebGPU Active'
                : gpuReady
                ? 'WebGPU Ready'
                : 'Local Engine'}
            </span>
          </button>

          <button
            type="button"
            onClick={onQuickRun}
            disabled={isRunning}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-cyan-400 px-3.5 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-300 disabled:opacity-60 sm:px-4 sm:text-sm"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>{isRunning ? 'Running...' : 'Run Pipeline'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
