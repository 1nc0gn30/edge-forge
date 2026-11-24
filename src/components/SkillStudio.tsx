import React, { useMemo, useState } from 'react';
import { ArrowRight, Code2, Play, Plus, Sparkles, Trash2 } from 'lucide-react';
import { executeSkill } from '../engine/localSkills';
import { cn } from '../lib/utils';
import { SkillDefinition, SkillTransformOp } from '../types';

interface SkillStudioProps {
  skills: SkillDefinition[];
  onSaveSkill: (skill: SkillDefinition) => void;
  onCreateSkill: () => SkillDefinition;
  onDeleteSkill: (id: string) => void;
  onAttachSkillToPipeline: (skill: SkillDefinition) => void;
}

const TRANSFORM_OPS: { value: SkillTransformOp; label: string; hint: string }[] = [
  { value: 'kv_to_json', label: 'Key-Value / Embedded JSON Parser', hint: 'Parses key=value or embedded JSON into formatted JSON.' },
  { value: 'word_freq', label: 'Keyword Frequency Counter', hint: 'Computes top non-stopword terms as JSON.' },
  { value: 'markdown_table', label: 'JSON / KV to Markdown Table', hint: 'Converts structured rows into a GFM table.' },
  { value: 'math_eval', label: 'Safe Arithmetic Evaluator', hint: 'Evaluates expressions line-by-line with a recursive-descent parser.' },
  { value: 'extract_urls', label: 'Extract Unique URLs', hint: 'Extracts deduplicated HTTP/HTTPS URLs as JSON.' },
  { value: 'extract_emails', label: 'Extract Unique Emails', hint: 'Extracts deduplicated email addresses as JSON.' },
  { value: 'dedupe_lines', label: 'Deduplicate Lines', hint: 'Removes repeated lines while preserving order.' },
  { value: 'uppercase', label: 'Uppercase Normalize', hint: 'Converts text to uppercase.' },
  { value: 'lowercase', label: 'Lowercase Normalize', hint: 'Converts text to lowercase.' },
];

const TEMPLATE_TOKENS = ['{{input}}', '{{word_count}}', '{{line_count}}', '{{est_tokens}}', '{{timestamp}}'];

export const SkillStudio: React.FC<SkillStudioProps> = ({
  skills,
  onSaveSkill,
  onCreateSkill,
  onDeleteSkill,
  onAttachSkillToPipeline,
}) => {
  const [selectedId, setSelectedId] = useState<string>(skills[0]?.id ?? '');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const activeSkill = skills.find((s) => s.id === selectedId) ?? skills[0];

  const liveExecution = useMemo(() => {
    if (!activeSkill) return null;
    const t0 = performance.now();
    try {
      const res = executeSkill(activeSkill, activeSkill.testInput);
      return {
        ok: true,
        output: res.output,
        metadata: res.metadata,
        durationMs: Number((performance.now() - t0).toFixed(2)),
      };
    } catch (err) {
      return {
        ok: false,
        output: err instanceof Error ? err.message : String(err),
        metadata: undefined,
        durationMs: Number((performance.now() - t0).toFixed(2)),
      };
    }
  }, [activeSkill]);

  const handleNewSkill = () => {
    const created = onCreateSkill();
    setSelectedId(created.id);
  };

  const updateField = <K extends keyof SkillDefinition>(key: K, value: SkillDefinition[K]) => {
    if (!activeSkill) return;
    onSaveSkill({
      ...activeSkill,
      [key]: value,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAttach = () => {
    if (!activeSkill) return;
    onAttachSkillToPipeline(activeSkill);
    setSavedNotice(`Added "${activeSkill.name}" node to the active pipeline.`);
    setTimeout(() => setSavedNotice(null), 2600);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* Left Skill List */}
      <aside className="panel-surface flex flex-col rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-200">
              Local Skill Library
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {skills.length} reusable skills persisted locally
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewSkill}
            className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>New</span>
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {skills.map((skill) => {
            const active = skill.id === activeSkill?.id;
            return (
              <div
                key={skill.id}
                className={cn(
                  'group flex items-start justify-between gap-2 rounded-xl border p-3 transition-colors',
                  active
                    ? 'border-cyan-400/45 bg-cyan-500/10'
                    : 'border-slate-800 bg-[#0d111a] hover:border-slate-700'
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(skill.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-xs font-semibold text-slate-100">
                      {skill.name}
                    </span>
                    <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                      {skill.category}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">{skill.description}</p>
                </button>
                {skills.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteSkill(skill.id);
                      if (skill.id === activeSkill?.id) {
                        const next = skills.find((s) => s.id !== skill.id);
                        if (next) setSelectedId(next.id);
                      }
                    }}
                    aria-label={`Delete skill ${skill.name}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Right Editor & Live Sandbox */}
      {activeSkill && (
        <section className="panel-surface space-y-5 rounded-2xl p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                <Code2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-slate-100">
                  Skill &amp; Prompt Template Studio
                </h2>
                <p className="text-xs text-slate-400">
                  Deterministic transforms &amp; composable prompt envelopes with instant sandbox preview.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAttach}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25"
            >
              <span>Attach to Pipeline</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {savedNotice && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-200">
              {savedNotice}
            </div>
          )}

          {/* Metadata Form */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="skill-name" className="block font-mono text-[11px] uppercase tracking-wider text-slate-400">
                Skill Identifier
              </label>
              <input
                id="skill-name"
                type="text"
                value={activeSkill.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="panel-inset mt-1.5 min-h-[42px] w-full rounded-xl px-3 font-mono text-xs text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="skill-category" className="block font-mono text-[11px] uppercase tracking-wider text-slate-400">
                Category
              </label>
              <select
                id="skill-category"
                value={activeSkill.category}
                onChange={(e) => updateField('category', e.target.value as SkillDefinition['category'])}
                className="panel-inset mt-1.5 min-h-[42px] w-full rounded-xl px-3 text-xs text-slate-100"
              >
                <option value="Extract" className="bg-[#0b0e15]">Extract</option>
                <option value="Transform" className="bg-[#0b0e15]">Transform</option>
                <option value="Prompt" className="bg-[#0b0e15]">Prompt</option>
                <option value="Compute" className="bg-[#0b0e15]">Compute</option>
              </select>
            </div>
            <div>
              <label htmlFor="skill-mode" className="block font-mono text-[11px] uppercase tracking-wider text-slate-400">
                Execution Mode
              </label>
              <select
                id="skill-mode"
                value={activeSkill.mode}
                onChange={(e) => updateField('mode', e.target.value as SkillDefinition['mode'])}
                className="panel-inset mt-1.5 min-h-[42px] w-full rounded-xl px-3 text-xs text-slate-100"
              >
                <option value="transform" className="bg-[#0b0e15]">Deterministic Transform</option>
                <option value="template" className="bg-[#0b0e15]">Prompt Template</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="skill-desc" className="block font-mono text-[11px] uppercase tracking-wider text-slate-400">
              Description
            </label>
            <input
              id="skill-desc"
              type="text"
              value={activeSkill.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="panel-inset mt-1.5 min-h-[42px] w-full rounded-xl px-3 text-xs text-slate-100"
            />
          </div>

          {/* Mode-Specific Definition */}
          {activeSkill.mode === 'transform' ? (
            <div>
              <label htmlFor="skill-transform-op" className="block font-mono text-[11px] uppercase tracking-wider text-slate-400">
                Local Transform Operator (Safe, Deterministic)
              </label>
              <select
                id="skill-transform-op"
                value={activeSkill.transformOp ?? 'kv_to_json'}
                onChange={(e) => updateField('transformOp', e.target.value as SkillTransformOp)}
                className="panel-inset mt-1.5 min-h-[44px] w-full rounded-xl px-3 text-xs text-cyan-200"
              >
                {TRANSFORM_OPS.map((op) => (
                  <option key={op.value} value={op.value} className="bg-[#0b0e15]">
                    {op.label} — {op.hint}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="skill-template" className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  Prompt Template Body
                </label>
                <div className="flex flex-wrap gap-1">
                  {TEMPLATE_TOKENS.map((tok) => (
                    <button
                      key={tok}
                      type="button"
                      onClick={() => updateField('template', `${activeSkill.template}${activeSkill.template ? ' ' : ''}${tok}`)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-cyan-300 hover:border-cyan-400/50"
                    >
                      {tok}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                id="skill-template"
                rows={4}
                value={activeSkill.template}
                onChange={(e) => updateField('template', e.target.value)}
                className="panel-inset mt-1.5 w-full rounded-xl p-3 font-mono text-xs leading-relaxed text-cyan-200"
              />
            </div>
          )}

          {/* Live Sandbox Split */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="skill-test-input" className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  Sandbox Test Input
                </label>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400">
                  <Play className="h-3 w-3 text-cyan-400" aria-hidden="true" /> Live eval
                </span>
              </div>
              <textarea
                id="skill-test-input"
                rows={6}
                value={activeSkill.testInput}
                onChange={(e) => updateField('testInput', e.target.value)}
                className="panel-inset mt-1.5 w-full rounded-xl p-3 font-mono text-xs leading-relaxed text-slate-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  Instant Local Output
                </span>
                {liveExecution && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-300">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {liveExecution.durationMs} ms
                  </span>
                )}
              </div>
              <pre
                className={cn(
                  'panel-inset mt-1.5 h-[146px] overflow-auto rounded-xl p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words',
                  liveExecution?.ok ? 'text-emerald-200' : 'text-rose-300'
                )}
              >
                {liveExecution?.output ?? ''}
              </pre>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
