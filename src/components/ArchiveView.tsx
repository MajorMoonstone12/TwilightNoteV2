import React, { useMemo, useState } from 'react';
import { Download, Edit3, Plus, Search, Trash2 } from 'lucide-react';
import type { TwilightNoteItem } from '../types';
import {
  countWords,
  formatShortDate,
  getNotePreviewTitle,
} from '../utils/reminderEngine';
import { AnalysisSection } from './AnalysisSection';

type ArchiveFilter = 'all' | 'unreviewed' | 'analyzed' | 'reviewed';

interface ArchiveViewProps {
  notes: TwilightNoteItem[];
  onOpenInEditor: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onAnalyzeNote: (note: TwilightNoteItem) => void;
  onNewNote: () => void;
  analyzingNoteId: string | null;
  analysisError: string | null;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  notes,
  onOpenInEditor,
  onDeleteNote,
  onAnalyzeNote,
  onNewNote,
  analyzingNoteId,
  analysisError,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ArchiveFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(
    notes[0]?.id ?? null
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (filter === 'unreviewed' && n.isReviewed) return false;
      if (filter === 'reviewed' && !n.isReviewed) return false;
      if (filter === 'analyzed' && !n.analysis) return false;

      if (query.trim()) {
        const q = query.toLowerCase();
        const inRaw = n.rawText.toLowerCase().includes(q);
        const inTitle =
          n.analysis?.refinedTitle.toLowerCase().includes(q) ?? false;
        const inProper =
          n.analysis?.properNote.toLowerCase().includes(q) ?? false;
        return inRaw || inTitle || inProper;
      }
      return true;
    });
  }, [notes, filter, query]);

  const activeNote =
    filteredNotes.find((n) => n.id === selectedId) ?? filteredNotes[0] ?? null;

  const handleExportMarkdown = (note: TwilightNoteItem) => {
    const title = getNotePreviewTitle(note);
    const lines = [
      `# ${title}`,
      '',
      `Captured: ${new Date(note.createdAt).toLocaleString()}`,
      `Status: ${note.isReviewed ? 'Reviewed' : 'Unreviewed'}`,
      '',
      '## Raw Thought',
      note.rawText,
    ];

    if (note.analysis) {
      lines.push(
        '',
        '## Expanded Note',
        note.analysis.properNote,
        '',
        '## Core Premise',
        note.analysis.corePremise,
        '',
        '## Feasibility & Prior-Art Check',
        note.analysis.realityCheck,
        '',
        '## Next Steps',
        ...note.analysis.actionSteps.map((s, idx) => `${idx + 1}. ${s}`)
      );
    }

    const blob = new Blob([lines.join('\n')], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'twilight-note'}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  if (notes.length === 0) {
    return (
      <div className="max-w-xl py-16 space-y-5">
        <p className="text-xs font-medium text-[#6E685F] dark:text-[#8E877C]">
          Monograph Archive
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[#171614] dark:text-[#F4EFE6] [text-wrap:balance]">
          Your nocturnal archive is empty
        </h1>
        <p className="text-base leading-relaxed text-[#57524A] dark:text-[#BDB5A6]">
          Every thought you type on the scratchpad is saved automatically on
          every keystroke and indexed here alongside its morning research brief.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onNewNote}
            className="min-h-[48px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F2B705] hover:bg-[#E2AA00] text-[#171614] font-semibold text-sm active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
          >
            <Plus className="w-4 h-4" />
            <span>Capture First Thought</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search & Interactive Segmented Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E5E0D8] dark:border-[#1E1D1B]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8E877C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search raw notes or morning briefs..."
            aria-label="Search archived notes"
            className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-sm text-[#171614] dark:text-[#F4EFE6] placeholder:text-[#9A9387] dark:placeholder:text-[#57524A] focus:outline-none focus:ring-2 focus:ring-[#F2B705]/70"
          />
        </div>

        <div
          role="group"
          aria-label="Filter notes"
          className="flex items-center gap-1 p-1 rounded-xl bg-[#EFECE4] dark:bg-[#0D0D10] border border-[#E5E0D8] dark:border-[#1E1D1B] overflow-x-auto no-scrollbar"
        >
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'unreviewed', label: 'Unreviewed' },
              { id: 'analyzed', label: 'Researched' },
              { id: 'reviewed', label: 'Reviewed' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70 ${
                filter === tab.id
                  ? 'bg-white dark:bg-[#19191F] text-[#171614] dark:text-[#F4EFE6] shadow-xs'
                  : 'text-[#6E685F] dark:text-[#8E877C] hover:text-[#171614] dark:hover:text-[#F4EFE6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <p className="py-12 text-sm text-[#6E685F] dark:text-[#8E877C]">
          No archived notes match your current search or filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Monograph Index */}
          <div className="lg:col-span-4 divide-y divide-[#E5E0D8]/80 dark:divide-[#1E1D1B] border-t border-b border-[#E5E0D8]/80 dark:border-[#1E1D1B]">
            {filteredNotes.map((note) => {
              const isSelected = activeNote?.id === note.id;
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(note.id);
                    setConfirmDeleteId(null);
                  }}
                  className={`w-full min-h-[66px] py-4 px-3 -mx-3 rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70 ${
                    isSelected
                      ? 'bg-[#EFECE4] dark:bg-[#121216]'
                      : 'hover:bg-[#F3F0E8] dark:hover:bg-[#0D0D10]'
                  }`}
                >
                  <p className="font-display text-base font-medium text-[#171614] dark:text-[#F4EFE6] truncate">
                    {getNotePreviewTitle(note)}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[#6E685F] dark:text-[#8E877C] truncate">
                    <span className="font-mono-tabular">
                      {formatShortDate(note.updatedAt)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">
                      {countWords(note.rawText)} words
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{note.isReviewed ? 'Reviewed' : 'Unreviewed'}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Manuscript Reader */}
          {activeNote && (
            <div className="lg:col-span-8 lg:border-l border-[#E5E0D8] dark:border-[#1E1D1B] lg:pl-10 space-y-7">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E5E0D8] dark:border-[#1E1D1B]">
                <div className="flex items-center gap-2 text-xs text-[#6E685F] dark:text-[#8E877C]">
                  <span className="font-mono-tabular">
                    {formatShortDate(activeNote.createdAt)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {activeNote.isReviewed ? 'Reviewed' : 'Unreviewed'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportMarkdown(activeNote)}
                    className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-xs font-semibold text-[#171614] dark:text-[#F4EFE6] hover:bg-[#F2EEE6] dark:hover:bg-[#151519] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export .md</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenInEditor(activeNote.id)}
                    className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-xs font-semibold text-[#171614] dark:text-[#F4EFE6] hover:bg-[#F2EEE6] dark:hover:bg-[#151519] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Manuscript</span>
                  </button>

                  {confirmDeleteId === activeNote.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteNote(activeNote.id);
                        setConfirmDeleteId(null);
                      }}
                      className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Delete</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(activeNote.id)}
                      aria-label="Delete note"
                      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-[#6E685F] dark:text-[#8E877C] hover:text-red-600 dark:hover:text-red-400 hover:bg-[#F2EEE6] dark:hover:bg-[#151519] active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-lg sm:text-xl leading-[1.7] text-[#171614] dark:text-[#F4EFE6] whitespace-pre-wrap">
                {activeNote.rawText}
              </p>

              {!activeNote.analysis && analyzingNoteId !== activeNote.id && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onAnalyzeNote(activeNote)}
                    className="min-h-[48px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F2B705] hover:bg-[#E2AA00] text-[#171614] font-semibold text-sm active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
                  >
                    <Search className="w-4 h-4" />
                    <span>Research &amp; Structure Idea</span>
                  </button>
                </div>
              )}

              <AnalysisSection
                analysis={activeNote.analysis}
                isAnalyzing={analyzingNoteId === activeNote.id}
                error={
                  analyzingNoteId === activeNote.id ? null : analysisError
                }
                onRetry={() => onAnalyzeNote(activeNote)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
