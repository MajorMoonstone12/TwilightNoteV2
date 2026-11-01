import React from 'react';
import { CheckCircle2, Plus, Search } from 'lucide-react';
import morningManuscriptImg from '../assets/images/morning_coffee_manuscript_1793551680764.jpg';
import type { TwilightNoteItem } from '../types';
import {
  countWords,
  formatShortDate,
  getNotePreviewTitle,
} from '../utils/reminderEngine';
import { AnalysisSection } from './AnalysisSection';
import { EditorialPicture } from './EditorialPicture';

interface MorningQueueViewProps {
  unreviewedNotes: TwilightNoteItem[];
  selectedId: string | null;
  onSelectNote: (id: string) => void;
  onMarkReviewed: (id: string) => void;
  onMarkAllReviewed: () => void;
  onAnalyzeNote: (note: TwilightNoteItem) => void;
  onStartCapture: () => void;
  analyzingNoteId: string | null;
  analysisError: string | null;
}

export const MorningQueueView: React.FC<MorningQueueViewProps> = ({
  unreviewedNotes,
  selectedId,
  onSelectNote,
  onMarkReviewed,
  onMarkAllReviewed,
  onAnalyzeNote,
  onStartCapture,
  analyzingNoteId,
  analysisError,
}) => {
  const activeItem =
    unreviewedNotes.find((n) => n.id === selectedId) ?? unreviewedNotes[0];

  if (unreviewedNotes.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch py-4 sm:py-8">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-[#6E685F] dark:text-[#8E877C]">
              Morning Reckoning · Queue Clear
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#171614] dark:text-[#F4EFE6] [text-wrap:balance]">
              Every midnight thought has been brought into daylight
            </h1>
            <p className="text-base leading-relaxed text-[#57524A] dark:text-[#BDB5A6] max-w-xl">
              Your persistent morning reminders are now silent. Whenever the
              next late-night idea strikes before sleep, open the scratchpad and
              type—TwilightNote will hold onto it until tomorrow morning.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onStartCapture}
              className="min-h-[48px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F2B705] hover:bg-[#E2AA00] text-[#171614] font-semibold text-sm active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
            >
              <Plus className="w-4 h-4" />
              <span>Open Bedside Scratchpad</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <EditorialPicture
            src={morningManuscriptImg}
            alt="Morning sunlight over an espresso cup and handwritten notebook on a stone desk"
            fallbackLabel="Morning Study & Manuscript"
            className="rounded-3xl aspect-[4/3] lg:aspect-auto lg:h-full min-h-[280px]"
          />
        </div>
      </div>
    );
  }

  const isAnalyzing = activeItem ? analyzingNoteId === activeItem.id : false;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E5E0D8] dark:border-[#1E1D1B]">
        <div className="space-y-1.5">
          <p className="text-xs text-[#6E685F] dark:text-[#8E877C] font-mono-tabular">
            {unreviewedNotes.length} unreviewed{' '}
            {unreviewedNotes.length === 1 ? 'capture' : 'captures'} awaiting
            morning review
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#171614] dark:text-[#F4EFE6] [text-wrap:balance]">
            Morning Idea Reckoning
          </h1>
        </div>

        {unreviewedNotes.length > 1 && (
          <button
            type="button"
            onClick={onMarkAllReviewed}
            className="min-h-[44px] self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-xs font-semibold text-[#171614] dark:text-[#F4EFE6] hover:bg-[#F2EEE6] dark:hover:bg-[#151519] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
          >
            <CheckCircle2 className="w-4 h-4 text-[#9A6500] dark:text-[#F2B705]" />
            <span>Mark All Reviewed</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Queue Master List */}
        <div className="lg:col-span-4 divide-y divide-[#E5E0D8]/80 dark:divide-[#1E1D1B] border-t border-b border-[#E5E0D8]/80 dark:border-[#1E1D1B]">
          {unreviewedNotes.map((note) => {
            const isActive = activeItem?.id === note.id;
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => onSelectNote(note.id)}
                className={`w-full min-h-[66px] py-4 px-3 -mx-3 rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70 ${
                  isActive
                    ? 'bg-[#EFECE4] dark:bg-[#121216]'
                    : 'hover:bg-[#F3F0E8] dark:hover:bg-[#0D0D10]'
                }`}
              >
                <p className="font-display text-base font-medium text-[#171614] dark:text-[#F4EFE6] truncate">
                  {getNotePreviewTitle(note)}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#6E685F] dark:text-[#8E877C]">
                  <span className="font-mono-tabular">
                    {formatShortDate(note.createdAt)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {countWords(note.rawText)} words
                  </span>
                  {note.nagCount > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular text-[#9A6500] dark:text-[#F2B705]">
                        Nudged {note.nagCount}x
                      </span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Unreviewed Thought Detail & AI Analyst */}
        {activeItem && (
          <div className="lg:col-span-8 lg:border-l border-[#E5E0D8] dark:border-[#1E1D1B] lg:pl-10 space-y-7">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-[#6E685F] dark:text-[#8E877C]">
                <span className="font-mono-tabular">
                  Captured {formatShortDate(activeItem.createdAt)}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {activeItem.isNightCapture
                    ? 'Hypnagogic night capture'
                    : 'Unreviewed note'}
                </span>
              </div>

              <p className="text-xl sm:text-[22px] leading-[1.7] text-[#171614] dark:text-[#F4EFE6] whitespace-pre-wrap">
                {activeItem.rawText}
              </p>
            </div>

            <div className="pt-5 border-t border-[#E5E0D8] dark:border-[#1E1D1B] flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() => onAnalyzeNote(activeItem)}
                className="min-h-[48px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F2B705] hover:bg-[#E2AA00] disabled:opacity-45 text-[#171614] font-semibold text-sm active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
              >
                <Search className="w-4 h-4" />
                <span>
                  {isAnalyzing
                    ? 'Researching Idea...'
                    : activeItem.analysis
                    ? 'Refresh Research'
                    : 'Research & Structure Idea'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onMarkReviewed(activeItem.id)}
                className="min-h-[48px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-sm font-semibold text-[#171614] dark:text-[#F4EFE6] hover:bg-[#F2EEE6] dark:hover:bg-[#151519] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
              >
                <CheckCircle2 className="w-4 h-4 text-[#9A6500] dark:text-[#F2B705]" />
                <span>Mark Reviewed &amp; Silence Alarm</span>
              </button>
            </div>

            <AnalysisSection
              analysis={activeItem.analysis}
              isAnalyzing={isAnalyzing}
              error={isAnalyzing ? null : analysisError}
              onRetry={() => onAnalyzeNote(activeItem)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
