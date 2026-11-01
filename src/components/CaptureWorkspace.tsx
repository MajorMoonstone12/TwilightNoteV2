import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Moon,
  Plus,
  Search,
  Sun,
} from 'lucide-react';
import type { ReminderSettings, TwilightNoteItem } from '../types';
import {
  countWords,
  formatClockTime,
  formatShortDate,
  getNotePreviewTitle,
} from '../utils/reminderEngine';
import { AnalysisSection } from './AnalysisSection';

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface CaptureWorkspaceProps {
  activeNote: TwilightNoteItem;
  recentNotes: TwilightNoteItem[];
  unreviewedCount: number;
  reminderSettings: ReminderSettings;
  isDark: boolean;
  onToggleTheme: () => void;
  onChangeText: (text: string) => void;
  onNewNote: () => void;
  onSelectNote: (id: string) => void;
  onAnalyzeNote: (note: TwilightNoteItem) => void;
  onToggleReviewed: (id: string) => void;
  onOpenMorningQueue: () => void;
  analyzingNoteId: string | null;
  analysisError: string | null;
  lastSavedAt: number | null;
  isSaving: boolean;
}

function toDayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export const CaptureWorkspace: React.FC<CaptureWorkspaceProps> = ({
  activeNote,
  recentNotes,
  unreviewedCount,
  reminderSettings,
  isDark,
  onToggleTheme,
  onChangeText,
  onNewNote,
  onSelectNote,
  onAnalyzeNote,
  onToggleReviewed,
  onOpenMorningQueue,
  analyzingNoteId,
  analysisError,
  lastSavedAt,
  isSaving,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const latestTextRef = useRef<string>(activeNote.rawText);

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [zenFocus, setZenFocus] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string>('all');
  const [nowClock, setNowClock] = useState<number>(() => Date.now());

  useEffect(() => {
    latestTextRef.current = activeNote.rawText;
  }, [activeNote.rawText]);

  useEffect(() => {
    const id = window.setInterval(() => setNowClock(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
      };
      setSpeechSupported(
        Boolean(win.SpeechRecognition || win.webkitSpeechRecognition)
      );
    }
    textareaRef.current?.focus();
  }, [activeNote.id]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // Build 7-day horizontal touch scroller
  const lastSevenDays = useMemo(() => {
    const days: {
      key: string;
      weekday: string;
      dayNum: string;
      isToday: boolean;
      count: number;
    }[] = [];
    const base = new Date(nowClock);
    const countsByDay = new Map<string, number>();
    for (const n of recentNotes) {
      const k = toDayKey(n.createdAt);
      countsByDay.set(k, (countsByDay.get(k) ?? 0) + 1);
    }

    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(base);
      d.setDate(base.getDate() - offset);
      const key = toDayKey(d.getTime());
      days.push({
        key,
        weekday: d
          .toLocaleDateString('en-US', { weekday: 'short' })
          .slice(0, 2),
        dayNum: String(d.getDate()).padStart(2, '0'),
        isToday: offset === 0,
        count: countsByDay.get(key) ?? 0,
      });
    }
    return days;
  }, [nowClock, recentNotes]);

  const ledgerNotes = useMemo(() => {
    if (selectedDayKey === 'all') return recentNotes;
    return recentNotes.filter((n) => toDayKey(n.createdAt) === selectedDayKey);
  }, [recentNotes, selectedDayKey]);

  const toggleDictation = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechCtor) return;

    const recognition = new SpeechCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let chunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          chunk += event.results[i][0].transcript + ' ';
        }
      }
      if (chunk.trim()) {
        const base = latestTextRef.current;
        const separator =
          base.length > 0 && !base.endsWith(' ') && !base.endsWith('\n')
            ? ' '
            : '';
        onChangeText(`${base}${separator}${chunk.trim()}`);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const words = countWords(activeNote.rawText);
  const isAnalyzingCurrent = analyzingNoteId === activeNote.id;

  const totalSaved = recentNotes.length;
  const reviewedCount = totalSaved - unreviewedCount;
  const ringPercentage =
    totalSaved === 0 ? 100 : Math.round((reviewedCount / totalSaved) * 100);
  const ringCircumference = 2 * Math.PI * 16;
  const ringOffset =
    ringCircumference - (ringPercentage / 100) * ringCircumference;

  return (
    <div
      className={`grid grid-cols-1 ${
        zenFocus ? 'lg:grid-cols-1 max-w-4xl mx-auto' : 'lg:grid-cols-12'
      } gap-10 lg:gap-12 items-start`}
    >
      {/* Left Manuscript Studio */}
      <div className={zenFocus ? 'w-full space-y-7' : 'lg:col-span-8 space-y-7'}>
        {/* Top Manuscript Header & Bedside Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E5E0D8] dark:border-[#1E1D1B]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-[#6E685F] dark:text-[#8E877C]">
              <span className="font-mono-tabular font-medium text-[#171614] dark:text-[#F4EFE6]">
                {formatClockTime(nowClock)}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {activeNote.rawText.trim().length === 0
                  ? 'Instant keystroke auto-save'
                  : isSaving
                  ? 'Saving keystroke...'
                  : lastSavedAt
                  ? `Saved ${formatClockTime(lastSavedAt)}`
                  : 'Saved on device'}
              </span>
              {words > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {words} {words === 1 ? 'word' : 'words'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {speechSupported && (
              <button
                type="button"
                onClick={toggleDictation}
                className={`min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70 ${
                  isListening
                    ? 'border-[#F2B705] bg-[#F2B705]/15 text-[#9A6500] dark:text-[#F2B705]'
                    : 'border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-[#171614] dark:text-[#F4EFE6] hover:bg-[#F2EEE6] dark:hover:bg-[#151519]'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Stop Dictation</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Dictate</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={
                isDark
                  ? 'Switch to Morning Paper daylight mode'
                  : 'Switch to Bedside OLED night mode'
              }
              className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-xs font-medium text-[#171614] dark:text-[#F4EFE6] hover:bg-[#F2EEE6] dark:hover:bg-[#151519] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-[#F2B705]" />
                  <span>Morning Paper</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-[#171614]" />
                  <span>Bedside OLED</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setZenFocus((z) => !z)}
              className="hidden lg:inline-flex min-h-[44px] items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-xs font-medium text-[#171614] dark:text-[#F4EFE6] hover:bg-[#F2EEE6] dark:hover:bg-[#151519] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
            >
              {zenFocus ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Show Ledger</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Focus Canvas</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onNewNote}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-xs font-medium text-[#171614] dark:text-[#F4EFE6] hover:bg-[#F2EEE6] dark:hover:bg-[#151519] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
            >
              <Plus className="w-4 h-4" />
              <span>Blank Page</span>
            </button>
          </div>
        </div>

        {/* Distraction-Free Nocturnal Manuscript Sheet */}
        <div className="space-y-3">
          {activeNote.analysis?.refinedTitle && (
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#171614] dark:text-[#F4EFE6] [text-wrap:balance]">
              {activeNote.analysis.refinedTitle}
            </h1>
          )}

          <label htmlFor="twilight-scratchpad" className="sr-only">
            Midnight thought manuscript
          </label>
          <textarea
            id="twilight-scratchpad"
            ref={textareaRef}
            value={activeNote.rawText}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="Write the thought before sleep takes it. No title, no folders, no save button..."
            rows={10}
            className="w-full min-h-[280px] resize-y bg-transparent text-lg sm:text-[21px] leading-[1.7] text-[#171614] dark:text-[#F4EFE6] placeholder:text-[#9A9387] dark:placeholder:text-[#57524A] focus:outline-none"
          />
        </div>

        {/* Thumb-Reach Action Bar */}
        <div className="pt-5 border-t border-[#E5E0D8] dark:border-[#1E1D1B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-[#6E685F] dark:text-[#8E877C] leading-relaxed">
            {activeNote.rawText.trim().length === 0 ? (
              <span>
                Unreviewed night notes trigger your{' '}
                <span className="font-mono-tabular font-semibold text-[#171614] dark:text-[#F4EFE6]">
                  {reminderSettings.morningTime}
                </span>{' '}
                alarm and repeat every{' '}
                <span className="font-mono-tabular">
                  {reminderSettings.repeatMinutes}m
                </span>{' '}
                until reviewed.
              </span>
            ) : activeNote.isReviewed ? (
              <span>
                Reviewed · Morning alarm silenced for this entry
              </span>
            ) : (
              <span>
                Queued for{' '}
                <span className="font-mono-tabular font-semibold text-[#9A6500] dark:text-[#F2B705]">
                  {reminderSettings.morningTime}
                </span>{' '}
                reckoning · Repeats every{' '}
                <span className="font-mono-tabular">
                  {reminderSettings.repeatMinutes}m
                </span>{' '}
                until opened
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {activeNote.rawText.trim().length > 0 && (
              <button
                type="button"
                onClick={() => onToggleReviewed(activeNote.id)}
                className="min-h-[48px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-xs font-semibold text-[#171614] dark:text-[#F4EFE6] hover:bg-[#F2EEE6] dark:hover:bg-[#151519] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
              >
                <CheckCircle2
                  className={`w-4 h-4 ${
                    activeNote.isReviewed
                      ? 'text-[#9A6500] dark:text-[#F2B705]'
                      : 'text-[#8E877C]'
                  }`}
                />
                <span>
                  {activeNote.isReviewed ? 'Reviewed' : 'Mark Reviewed'}
                </span>
              </button>
            )}

            <button
              type="button"
              disabled={
                activeNote.rawText.trim().length === 0 || isAnalyzingCurrent
              }
              onClick={() => onAnalyzeNote(activeNote)}
              className="min-h-[48px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F2B705] hover:bg-[#E2AA00] disabled:opacity-40 disabled:pointer-events-none text-[#171614] font-semibold text-sm active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
            >
              <Search className="w-4 h-4" />
              <span>
                {isAnalyzingCurrent
                  ? 'Researching Idea...'
                  : activeNote.analysis
                  ? 'Refresh Research'
                  : 'Research & Structure Idea'}
              </span>
            </button>
          </div>
        </div>

        {/* Inline Gemini Research Monograph */}
        <AnalysisSection
          analysis={activeNote.analysis}
          isAnalyzing={isAnalyzingCurrent}
          error={isAnalyzingCurrent ? null : analysisError}
          onRetry={() => onAnalyzeNote(activeNote)}
        />
      </div>

      {/* Right Bedside Ledger (Hidden only when Focus Canvas is engaged) */}
      {!zenFocus && (
        <aside className="lg:col-span-4 lg:border-l border-[#E5E0D8] dark:border-[#1E1D1B] lg:pl-10 space-y-8">
          {/* 2-Column Metric Summary + SVG Micro Progress Ring */}
          <div className="grid grid-cols-2 gap-4 pb-7 border-b border-[#E5E0D8] dark:border-[#1E1D1B]">
            <div className="p-4 rounded-2xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <p className="text-[11px] text-[#6E685F] dark:text-[#8E877C] truncate">
                  Morning Review
                </p>
                <p className="font-mono-tabular text-xl font-bold text-[#171614] dark:text-[#F4EFE6]">
                  {reviewedCount}/{totalSaved}
                </p>
              </div>
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                className="-rotate-90 shrink-0"
                aria-hidden="true"
              >
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  className="text-[#E5E0D8] dark:text-[#1E1D1B]"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="text-[#C87D00] dark:text-[#F2B705] transition-all duration-300"
                />
              </svg>
            </div>

            <div className="p-4 rounded-2xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] flex flex-col justify-between">
              <p className="text-[11px] text-[#6E685F] dark:text-[#8E877C] truncate">
                Daily Wake Alarm
              </p>
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <span className="font-mono-tabular text-xl font-bold text-[#171614] dark:text-[#F4EFE6]">
                  {reminderSettings.morningTime}
                </span>
                <span className="font-mono-tabular text-[11px] text-[#6E685F] dark:text-[#8E877C]">
                  /{reminderSettings.repeatMinutes}m
                </span>
              </div>
            </div>
          </div>

          {/* Unreviewed Queue Action Prompt */}
          {unreviewedCount > 0 && (
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-[#E5E0D8] dark:border-[#1E1D1B]">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-[#171614] dark:text-[#F4EFE6]">
                  {unreviewedCount} unreviewed{' '}
                  {unreviewedCount === 1 ? 'note' : 'notes'} queued
                </p>
                <p className="text-xs text-[#6E685F] dark:text-[#8E877C]">
                  Open Morning Queue to silence follow-ups
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenMorningQueue}
                className="min-h-[44px] inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-[#9A6500] dark:text-[#F2B705] hover:underline whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
              >
                <span>Open Queue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Horizontal 7-Day Night Scroller */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#6E685F] dark:text-[#8E877C]">
                Nightly Ledger
              </h2>
              {selectedDayKey !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedDayKey('all')}
                  className="text-xs font-medium text-[#9A6500] dark:text-[#F2B705] hover:underline whitespace-nowrap shrink-0"
                >
                  Show all dates
                </button>
              )}
            </div>

            <div
              role="group"
              aria-label="Filter recent captures by night"
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1"
            >
              {lastSevenDays.map((day) => {
                const isSelected = selectedDayKey === day.key;
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() =>
                      setSelectedDayKey((prev) =>
                        prev === day.key ? 'all' : day.key
                      )
                    }
                    className={`min-h-[52px] min-w-[46px] px-2.5 py-2 rounded-2xl flex flex-col items-center justify-center transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70 ${
                      isSelected
                        ? 'bg-[#171614] text-[#FAF8F5] dark:bg-[#F2B705] dark:text-[#171614]'
                        : 'border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-[#6E685F] dark:text-[#8E877C] hover:text-[#171614] dark:hover:text-[#F4EFE6]'
                    }`}
                  >
                    <span className="text-[10px] font-medium">
                      {day.isToday ? 'Now' : day.weekday}
                    </span>
                    <span className="font-mono-tabular text-xs font-semibold mt-0.5">
                      {day.dayNum}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tap List Rows of Captured Notes */}
          {ledgerNotes.length === 0 ? (
            <p className="py-6 text-sm text-[#6E685F] dark:text-[#8E877C] leading-relaxed">
              {selectedDayKey === 'all'
                ? 'Start typing on the manuscript canvas—every word saves automatically without a save button.'
                : 'No thoughts recorded on this date.'}
            </p>
          ) : (
            <div className="divide-y divide-[#E5E0D8]/80 dark:divide-[#1E1D1B] border-t border-b border-[#E5E0D8]/80 dark:border-[#1E1D1B]">
              {ledgerNotes.slice(0, 7).map((note) => {
                const isSelected = note.id === activeNote.id;
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => onSelectNote(note.id)}
                    className={`w-full min-h-[64px] py-3.5 px-3 -mx-3 rounded-xl text-left flex items-center justify-between gap-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70 ${
                      isSelected
                        ? 'bg-[#EFECE4] dark:bg-[#121216]'
                        : 'hover:bg-[#F3F0E8] dark:hover:bg-[#0D0D10]'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-display text-[15px] font-medium text-[#171614] dark:text-[#F4EFE6] truncate">
                        {getNotePreviewTitle(note)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#6E685F] dark:text-[#8E877C] truncate">
                        <span className="font-mono-tabular">
                          {formatShortDate(note.updatedAt)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            note.isReviewed
                              ? ''
                              : 'text-[#9A6500] dark:text-[#F2B705] font-medium'
                          }
                        >
                          {note.isReviewed ? 'Reviewed' : 'Unreviewed'}
                        </span>
                        {note.analysis && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Researched</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9A9387] dark:text-[#57524A] shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </aside>
      )}
    </div>
  );
};
