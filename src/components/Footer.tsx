import React, { useState } from 'react';
import { Check, Coffee, Copy, ExternalLink, Github } from 'lucide-react';

const STRIPE_COFFEE_URL = 'https://buy.stripe.com/3cIfZg27PdKo2D64Ocfw40X';
const SOLANA_TIP_ADDRESS = 'GG2eQbVh8ut1BK6j1A2tz7pSySdLpD38BgyEhGcxdXoK';

export const Footer: React.FC = () => {
  const [copiedSol, setCopiedSol] = useState(false);

  const handleCopySol = async () => {
    try {
      await navigator.clipboard.writeText(SOLANA_TIP_ADDRESS);
      setCopiedSol(true);
      setTimeout(() => setCopiedSol(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-[#080a0f]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Attribution */}
        <div className="space-y-1">
          <p className="text-xs text-slate-300">
            Engineered by{' '}
            <a
              href="https://nullai.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-100 underline decoration-slate-600 underline-offset-4 hover:text-cyan-300"
            >
              Neal Frazier Tech (@1nc0gn30) • NullAI Platform
            </a>
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <a
              href="https://github.com/1nc0gn30/edge-forge"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-cyan-300"
            >
              <Github className="h-3.5 w-3.5" aria-hidden="true" />
              <span>1nc0gn30/edge-forge</span>
            </a>
            <span aria-hidden="true">·</span>
            <span>100% free &amp; open-access · runs locally in your browser</span>
          </div>
        </div>

        {/* Non-Intrusive Buy Us a Coffee Support */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={STRIPE_COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/20"
          >
            <Coffee className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Buy Us a Coffee</span>
            <ExternalLink className="h-3 w-3 opacity-75" aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={handleCopySol}
            title={`Copy Solana tip address: ${SOLANA_TIP_ADDRESS}`}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900 px-3 py-2 font-mono text-[11px] text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
          >
            {copiedSol ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            )}
            <span>
              {copiedSol ? 'SOL Address Copied' : 'SOL Tip: GG2eQb...dXoK'}
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
};
