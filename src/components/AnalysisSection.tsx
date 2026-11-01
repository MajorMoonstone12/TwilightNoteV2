import React, { useState } from 'react';
import { Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import type { AIAnalysisResult } from '../types';
import { formatClockTime } from '../utils/reminderEngine';

interface AnalysisSectionProps {
  analysis?: AIAnalysisResult;
  isAnalyzing: boolean;
  error: string | null;
  onRetry: () => void;
}

export const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  analysis,
  isAnalyzing,
  error,
  onRetry,
}) => {
  const [copiedProper, setCopiedProper] = useState(false);

  if (!isAnalyzing && !error && !analysis) {
    return null;
  }

  const handleCopyProperNote = async () => {
    if (!analysis) return;
    try {
      const formatted = `${analysis.refinedTitle}\n\n${analysis.properNote}\n\nNext Steps:\n${analysis.actionSteps
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n')}`;
      await navigator.clipboard.writeText(formatted);
      setCopiedProper(true);
      setTimeout(() => setCopiedProper(false), 2000);
    } catch {
      setCopiedProper(false);
    }
  };

  if (isAnalyzing) {
    return (
      <section
        aria-live="polite"
        className="pt-10 mt-10 border-t border-[#E5E0D8] dark:border-[#1E1D1B] space-y-6"
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-medium text-[#9A6500] dark:text-[#F2B705]">
            Morning Analyst · Deciphering fragment &amp; checking web prior art...
          </p>
        </div>
        <div className="space-y-3.5 animate-pulse">
          <div className="h-7 w-1/2 rounded-lg bg-[#E5E0D8] dark:bg-[#19191D]" />
          <div className="h-4 w-full rounded bg-[#EBE7DF] dark:bg-[#141418]" />
          <div className="h-4 w-4/5 rounded bg-[#EBE7DF] dark:bg-[#141418]" />
          <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-24 rounded-xl bg-[#EBE7DF] dark:bg-[#141418]" />
            <div className="h-24 rounded-xl bg-[#EBE7DF] dark:bg-[#141418]" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        aria-live="assertive"
        className="pt-10 mt-10 border-t border-[#E5E0D8] dark:border-[#1E1D1B]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-red-300/80 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/20 text-red-900 dark:text-red-200">
          <p className="text-sm leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-300 dark:border-red-800/80 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Research</span>
          </button>
        </div>
      </section>
    );
  }

  if (!analysis) return null;

  return (
    <section className="pt-10 mt-10 border-t border-[#E5E0D8] dark:border-[#1E1D1B] space-y-10">
      {/* Dossier Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-[#6E685F] dark:text-[#8E877C]">
            <span>Morning Research Monograph</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              Synthesized {formatClockTime(analysis.analyzedAt)}
            </span>
          </div>
          <h3 className="font-display text-2xl sm:text-[28px] font-semibold leading-tight tracking-tight text-[#171614] dark:text-[#F4EFE6] [text-wrap:balance]">
            {analysis.refinedTitle}
          </h3>
          <p className="text-base leading-relaxed text-[#423E38] dark:text-[#CFC8BC]">
            {analysis.corePremise}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyProperNote}
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-xs font-semibold text-[#171614] dark:text-[#F4EFE6] hover:bg-[#F2EEE6] dark:hover:bg-[#16161B] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
        >
          {copiedProper ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#9A6500] dark:text-[#F2B705]" />
              <span>Copied Manuscript</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Proper Note</span>
            </>
          )}
        </button>
      </div>

      {/* 01. Expanded Proper Note */}
      <div className="pt-8 border-t border-[#E5E0D8]/80 dark:border-[#1E1D1B] space-y-2.5">
        <h4 className="text-sm font-semibold text-[#171614] dark:text-[#F4EFE6]">
          01. Expanded Manuscript Note
        </h4>
        <p className="text-[16px] leading-[1.75] text-[#2B2824] dark:text-[#E5DEC9] max-w-[70ch]">
          {analysis.properNote}
        </p>
      </div>

      {/* 02 & 03. Subconscious Trigger & Feasibility Split */}
      <div className="pt-8 border-t border-[#E5E0D8]/80 dark:border-[#1E1D1B] grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div className="space-y-2.5">
          <h4 className="text-sm font-semibold text-[#171614] dark:text-[#F4EFE6]">
            02. Why It Surfaced Before Sleep
          </h4>
          <p className="text-[15px] leading-relaxed text-[#57524A] dark:text-[#BDB5A6]">
            {analysis.subconsciousInsight}
          </p>
        </div>

        <div className="space-y-2.5">
          <h4 className="text-sm font-semibold text-[#171614] dark:text-[#F4EFE6]">
            03. Reality &amp; Prior-Art Check
          </h4>
          <p className="text-[15px] leading-relaxed text-[#57524A] dark:text-[#BDB5A6]">
            {analysis.realityCheck}
          </p>
        </div>
      </div>

      {/* 04. Concrete Next Actions */}
      {analysis.actionSteps.length > 0 && (
        <div className="pt-8 border-t border-[#E5E0D8]/80 dark:border-[#1E1D1B] space-y-4">
          <h4 className="text-sm font-semibold text-[#171614] dark:text-[#F4EFE6]">
            04. Thirty-Minute Validation Steps
          </h4>
          <ol className="space-y-3">
            {analysis.actionSteps.map((step, idx) => (
              <li
                key={idx}
                className="flex items-baseline gap-3.5 text-[15px] leading-relaxed text-[#2B2824] dark:text-[#DDD6C7]"
              >
                <span className="font-mono-tabular text-xs font-medium text-[#9A6500] dark:text-[#F2B705] shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Grounded Web Sources */}
      {analysis.sources && analysis.sources.length > 0 && (
        <div className="pt-8 border-t border-[#E5E0D8]/80 dark:border-[#1E1D1B] space-y-3">
          <h4 className="text-xs font-medium text-[#6E685F] dark:text-[#8E877C]">
            Grounded Web References
          </h4>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
            {analysis.sources.map((src, idx) => (
              <a
                key={idx}
                href={src.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9A6500] dark:text-[#F2B705] hover:underline max-w-[260px] truncate"
              >
                <span className="truncate">{src.title}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
