import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Bell,
  BellRing,
  Download,
  Feather,
  Plus,
  Sunrise,
  WifiOff,
} from 'lucide-react';
import type {
  AIAnalysisResult,
  ReminderSettings,
  TwilightNoteItem,
  WorkspaceTab,
} from './types';
import {
  computeNextMorningTimestamp,
  DEFAULT_REMINDER_SETTINGS,
  dispatchSystemNotification,
  getNotePreviewTitle,
  isNightTimeNow,
} from './utils/reminderEngine';
import { playMorningChime } from './utils/chime';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { CaptureWorkspace } from './components/CaptureWorkspace';
import { MorningQueueView } from './components/MorningQueueView';
import { ArchiveView } from './components/ArchiveView';
import { RemindersView } from './components/RemindersView';
import { PWAInstallModal } from './components/PWAInstallModal';

const STORAGE_NOTES_KEY = 'twilightnote_items_v1';
const STORAGE_SETTINGS_KEY = 'twilightnote_reminder_settings_v1';
const STORAGE_THEME_KEY = 'twilightnote_theme_v1';

function createBlankNote(settings: ReminderSettings): TwilightNoteItem {
  const now = Date.now();
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `tn_${now}_${Math.random().toString(36).slice(2, 8)}`,
    rawText: '',
    createdAt: now,
    updatedAt: now,
    isNightCapture: isNightTimeNow(settings, new Date(now)),
    isReviewed: false,
    nagCount: 0,
    nextReminderAt: computeNextMorningTimestamp(
      settings.morningTime,
      new Date(now)
    ),
  };
}

function loadStoredSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) return DEFAULT_REMINDER_SETTINGS;
    return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

function loadStoredNotes(): TwilightNoteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(
    () => loadStoredSettings()
  );

  const [savedNotes, setSavedNotes] = useState<TwilightNoteItem[]>(() =>
    loadStoredNotes()
  );

  const [draftNote, setDraftNote] = useState<TwilightNoteItem>(() =>
    createBlankNote(loadStoredSettings())
  );

  const [activeNoteId, setActiveNoteId] = useState<string>(
    () => draftNote.id
  );
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('capture');
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_THEME_KEY);
      if (stored === 'light') return false;
      return true;
    } catch {
      return true;
    }
  });

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [analyzingNoteId, setAnalyzingNoteId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeReminderBannerNoteId, setActiveReminderBannerNoteId] = useState<
    string | null
  >(null);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);

  const { isInstallable, isInstalled, isIOS, isInIframe, install } =
    usePWAInstall();
  const isOnline = useOnlineStatus();

  const saveTimerRef = useRef<number | null>(null);
  const pendingNotesRef = useRef<TwilightNoteItem[]>(savedNotes);

  // Sync <html class="dark"> and theme-color meta tag
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#050506' : '#FAF8F5');
    }
    try {
      localStorage.setItem(STORAGE_THEME_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [isDark]);

  // Persist reminder settings
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_SETTINGS_KEY,
        JSON.stringify(reminderSettings)
      );
    } catch {
      // Ignore
    }
  }, [reminderSettings]);

  const flushNotesToStorage = useCallback((items: TwilightNoteItem[]) => {
    const nonEmpty = items
      .filter((n) => n.rawText.trim().length > 0)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    try {
      localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(nonEmpty));
      setLastSavedAt(Date.now());
    } catch {
      // Ignore
    }
    setIsSaving(false);
  }, []);

  // Immediate flush when locking phone screen or hiding tab
  useEffect(() => {
    const handleVisibilityOrHide = () => {
      if (document.visibilityState === 'hidden') {
        if (saveTimerRef.current) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        flushNotesToStorage(pendingNotesRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrHide);
    window.addEventListener('pagehide', handleVisibilityOrHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrHide);
      window.removeEventListener('pagehide', handleVisibilityOrHide);
    };
  }, [flushNotesToStorage]);

  const activeNote: TwilightNoteItem = useMemo(() => {
    const found = savedNotes.find((n) => n.id === activeNoteId);
    if (found) return found;
    if (draftNote.id === activeNoteId) return draftNote;
    return draftNote;
  }, [savedNotes, activeNoteId, draftNote]);

  const nonEmptyNotes = useMemo(
    () =>
      savedNotes
        .filter((n) => n.rawText.trim().length > 0)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [savedNotes]
  );

  const unreviewedNotes = useMemo(
    () => nonEmptyNotes.filter((n) => !n.isReviewed),
    [nonEmptyNotes]
  );

  const handleChangeText = useCallback(
    (newText: string) => {
      const now = Date.now();
      setIsSaving(true);
      setAnalysisError(null);

      setSavedNotes((prev) => {
        const exists = prev.some((n) => n.id === activeNoteId);
        let nextList: TwilightNoteItem[];

        if (exists) {
          nextList = prev.map((n) =>
            n.id === activeNoteId
              ? {
                  ...n,
                  rawText: newText,
                  updatedAt: now,
                  nextReminderAt:
                    n.nextReminderAt ??
                    computeNextMorningTimestamp(reminderSettings.morningTime),
                }
              : n
          );
        } else {
          const updatedDraft: TwilightNoteItem = {
            ...draftNote,
            id: activeNoteId,
            rawText: newText,
            updatedAt: now,
            nextReminderAt: computeNextMorningTimestamp(
              reminderSettings.morningTime
            ),
          };
          setDraftNote(updatedDraft);
          nextList =
            newText.trim().length > 0 ? [updatedDraft, ...prev] : prev;
        }

        pendingNotesRef.current = nextList;

        if (saveTimerRef.current) {
          window.clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = window.setTimeout(() => {
          flushNotesToStorage(nextList);
          saveTimerRef.current = null;
        }, 250);

        return nextList;
      });
    },
    [activeNoteId, draftNote, flushNotesToStorage, reminderSettings.morningTime]
  );

  const handleNewNote = useCallback(() => {
    const fresh = createBlankNote(reminderSettings);
    setDraftNote(fresh);
    setActiveNoteId(fresh.id);
    setAnalysisError(null);
    setActiveTab('capture');
  }, [reminderSettings]);

  const handleSelectNote = useCallback((id: string) => {
    setActiveNoteId(id);
    setAnalysisError(null);
    setActiveTab('capture');
  }, []);

  const handleMarkReviewed = useCallback(
    (id: string) => {
      const now = Date.now();
      setSavedNotes((prev) => {
        const next = prev.map((n) =>
          n.id === id
            ? {
                ...n,
                isReviewed: true,
                reviewedAt: now,
              }
            : n
        );
        pendingNotesRef.current = next;
        flushNotesToStorage(next);
        return next;
      });
      if (activeReminderBannerNoteId === id) {
        setActiveReminderBannerNoteId(null);
      }
    },
    [activeReminderBannerNoteId, flushNotesToStorage]
  );

  const handleToggleReviewed = useCallback(
    (id: string) => {
      const now = Date.now();
      setSavedNotes((prev) => {
        const next = prev.map((n) => {
          if (n.id !== id) return n;
          const nextState = !n.isReviewed;
          return {
            ...n,
            isReviewed: nextState,
            reviewedAt: nextState ? now : undefined,
            nextReminderAt: nextState
              ? n.nextReminderAt
              : computeNextMorningTimestamp(reminderSettings.morningTime),
          };
        });
        pendingNotesRef.current = next;
        flushNotesToStorage(next);
        return next;
      });
    },
    [flushNotesToStorage, reminderSettings.morningTime]
  );

  const handleMarkAllReviewed = useCallback(() => {
    const now = Date.now();
    setSavedNotes((prev) => {
      const next = prev.map((n) =>
        n.isReviewed ? n : { ...n, isReviewed: true, reviewedAt: now }
      );
      pendingNotesRef.current = next;
      flushNotesToStorage(next);
      return next;
    });
    setActiveReminderBannerNoteId(null);
  }, [flushNotesToStorage]);

  const handleDeleteNote = useCallback(
    (id: string) => {
      setSavedNotes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        pendingNotesRef.current = next;
        flushNotesToStorage(next);
        return next;
      });
      if (activeNoteId === id) {
        const fresh = createBlankNote(reminderSettings);
        setDraftNote(fresh);
        setActiveNoteId(fresh.id);
      }
      if (activeReminderBannerNoteId === id) {
        setActiveReminderBannerNoteId(null);
      }
    },
    [
      activeNoteId,
      activeReminderBannerNoteId,
      flushNotesToStorage,
      reminderSettings,
    ]
  );

  const handleAnalyzeNote = useCallback(
    async (note: TwilightNoteItem) => {
      if (!note.rawText.trim()) return;
      setAnalyzingNoteId(note.id);
      setAnalysisError(null);

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawNote: note.rawText,
            capturedAt: new Date(note.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            forceRefresh: Boolean(note.analysis),
          }),
        });

        const data = (await res.json()) as {
          analysis?: AIAnalysisResult;
          error?: string;
        };

        if (!res.ok || !data.analysis) {
          throw new Error(
            data.error || 'Could not analyze thought right now.'
          );
        }

        const analysisResult = data.analysis;
        const now = Date.now();

        setSavedNotes((prev) => {
          const next = prev.map((n) =>
            n.id === note.id
              ? {
                  ...n,
                  analysis: analysisResult,
                  isReviewed: true,
                  reviewedAt: now,
                  updatedAt: now,
                }
              : n
          );
          pendingNotesRef.current = next;
          flushNotesToStorage(next);
          return next;
        });

        if (activeReminderBannerNoteId === note.id) {
          setActiveReminderBannerNoteId(null);
        }
      } catch (err: unknown) {
        setAnalysisError(
          err instanceof Error
            ? err.message
            : 'Network error while reaching Morning Analyst.'
        );
      } finally {
        setAnalyzingNoteId(null);
      }
    },
    [activeReminderBannerNoteId, flushNotesToStorage]
  );

  const fireMorningReminderForNote = useCallback(
    (target: TwilightNoteItem) => {
      const now = Date.now();
      const nextFollowUp = now + reminderSettings.repeatMinutes * 60_000;

      setSavedNotes((prev) => {
        const next = prev.map((n) =>
          n.id === target.id
            ? {
                ...n,
                nagCount: n.nagCount + 1,
                lastRemindedAt: now,
                nextReminderAt: nextFollowUp,
              }
            : n
        );
        pendingNotesRef.current = next;
        flushNotesToStorage(next);
        return next;
      });

      setActiveReminderBannerNoteId(target.id);

      if (reminderSettings.soundChime) {
        playMorningChime();
      }

      const preview = getNotePreviewTitle(target);
      dispatchSystemNotification(
        'TwilightNote · Morning Idea Waiting',
        `"${preview}" — Open to review & silence reminders.`,
        () => {
          setSelectedQueueId(target.id);
          setActiveTab('morning');
        }
      );
    },
    [
      flushNotesToStorage,
      reminderSettings.repeatMinutes,
      reminderSettings.soundChime,
    ]
  );

  useEffect(() => {
    if (!reminderSettings.enabled) return;

    const checkDueReminders = () => {
      const now = Date.now();
      const dueNote = unreviewedNotes.find(
        (n) => n.nextReminderAt !== undefined && now >= n.nextReminderAt
      );
      if (dueNote) {
        fireMorningReminderForNote(dueNote);
      }
    };

    checkDueReminders();
    const intervalId = window.setInterval(checkDueReminders, 20_000);
    return () => window.clearInterval(intervalId);
  }, [
    fireMorningReminderForNote,
    reminderSettings.enabled,
    unreviewedNotes,
  ]);

  const handleTriggerTestReminder = useCallback(() => {
    if (unreviewedNotes.length > 0) {
      fireMorningReminderForNote(unreviewedNotes[0]);
      return;
    }

    if (nonEmptyNotes.length > 0) {
      const latest = nonEmptyNotes[0];
      const reopened: TwilightNoteItem = { ...latest, isReviewed: false };
      setSavedNotes((prev) =>
        prev.map((n) => (n.id === latest.id ? reopened : n))
      );
      fireMorningReminderForNote(reopened);
      return;
    }

    if (reminderSettings.soundChime) {
      playMorningChime();
    }
    dispatchSystemNotification(
      'TwilightNote · Morning Check-In Ready',
      `Write any late-night note and TwilightNote will remind you at ${reminderSettings.morningTime} until reviewed.`
    );
    setActiveTab('capture');
  }, [
    fireMorningReminderForNote,
    nonEmptyNotes,
    reminderSettings.morningTime,
    reminderSettings.soundChime,
    unreviewedNotes,
  ]);

  const handleSnoozeBanner = () => {
    if (!activeReminderBannerNoteId) return;
    const nextFollowUp = Date.now() + reminderSettings.repeatMinutes * 60_000;
    setSavedNotes((prev) => {
      const next = prev.map((n) =>
        n.id === activeReminderBannerNoteId
          ? { ...n, nextReminderAt: nextFollowUp }
          : n
      );
      pendingNotesRef.current = next;
      flushNotesToStorage(next);
      return next;
    });
    setActiveReminderBannerNoteId(null);
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const bannerNote = useMemo(
    () =>
      unreviewedNotes.find((n) => n.id === activeReminderBannerNoteId) ?? null,
    [activeReminderBannerNoteId, unreviewedNotes]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#171614] dark:bg-[#050506] dark:text-[#F4EFE6] pb-20 md:pb-16">
      {/* Top Bar Contract: Strictly 1 row, 3 zones separated by gap-8 */}
      <header className="md:sticky md:top-0 z-30 border-b border-[#E5E0D8] dark:border-[#1E1D1B] bg-[#FAF8F5]/90 dark:bg-[#050506]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text wordmark */}
          <a
            href="#capture"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('capture');
            }}
            className="font-display text-xl font-semibold tracking-tight text-[#171614] dark:text-[#F4EFE6] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70 rounded"
          >
            TwilightNote
          </a>

          {/* Zone 2: 4 concise single-line text links */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {(
              [
                { id: 'capture', label: 'Capture' },
                {
                  id: 'morning',
                  label:
                    unreviewedNotes.length > 0
                      ? `Morning Queue (${unreviewedNotes.length})`
                      : 'Morning Queue',
                },
                { id: 'archive', label: 'Archive' },
                { id: 'reminders', label: 'Reminders' },
              ] as const
            ).map((item) => {
              const isCurrent = activeTab === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab(item.id);
                  }}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    isCurrent
                      ? 'border-[#F2B705] text-[#171614] dark:text-[#F4EFE6]'
                      : 'border-transparent text-[#6E685F] dark:text-[#8E877C] hover:text-[#171614] dark:hover:text-[#F4EFE6]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            {!isInstalled ? (
              <button
                type="button"
                onClick={handleInstallClick}
                className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F2B705] hover:bg-[#E2AA00] text-[#171614] text-xs font-semibold active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNewNote}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F2B705] hover:bg-[#E2AA00] text-[#171614] text-xs font-semibold active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Thought</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        {/* Offline Reassurance Notice */}
        {!isOnline && (
          <div className="mb-6 px-4 py-3 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] flex items-center gap-2.5 text-xs text-[#423E38] dark:text-[#CFC8BC]">
            <WifiOff className="w-4 h-4 text-[#9A6500] dark:text-[#F2B705] shrink-0" />
            <span>
              Offline mode — Every keystroke continues saving locally on your
              device. Morning web research reconnects automatically when online.
            </span>
          </div>
        )}

        {/* Persistent Morning Reminder Alert Banner */}
        {bannerNote && (
          <div
            role="region"
            aria-label="Persistent morning thought reminder"
            className="mb-8 p-4 sm:p-5 rounded-2xl border border-[#F2B705]/45 bg-[#F2B705]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#F2B705]/20 text-[#9A6500] dark:text-[#F2B705] flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-medium text-[#9A6500] dark:text-[#F2B705] font-mono-tabular">
                  Unreviewed Midnight Thought · Nudge #{bannerNote.nagCount}
                </p>
                <p className="font-display text-base font-semibold text-[#171614] dark:text-[#F4EFE6] truncate">
                  &ldquo;{getNotePreviewTitle(bannerNote)}&rdquo;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleSnoozeBanner}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D6D0C4] dark:border-[#272624] text-xs font-semibold text-[#171614] dark:text-[#F4EFE6] hover:bg-[#EFECE4] dark:hover:bg-[#151519] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
              >
                Snooze {reminderSettings.repeatMinutes}m
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedQueueId(bannerNote.id);
                  setActiveTab('morning');
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F2B705] hover:bg-[#E2AA00] text-[#171614] text-xs font-semibold active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
              >
                Open &amp; Review
              </button>
            </div>
          </div>
        )}

        {/* Active Workspace View */}
        {activeTab === 'capture' && (
          <CaptureWorkspace
            activeNote={activeNote}
            recentNotes={nonEmptyNotes}
            unreviewedCount={unreviewedNotes.length}
            reminderSettings={reminderSettings}
            isDark={isDark}
            onToggleTheme={() => setIsDark((d) => !d)}
            onChangeText={handleChangeText}
            onNewNote={handleNewNote}
            onSelectNote={handleSelectNote}
            onAnalyzeNote={handleAnalyzeNote}
            onToggleReviewed={handleToggleReviewed}
            onOpenMorningQueue={() => setActiveTab('morning')}
            analyzingNoteId={analyzingNoteId}
            analysisError={analysisError}
            lastSavedAt={lastSavedAt}
            isSaving={isSaving}
          />
        )}

        {activeTab === 'morning' && (
          <MorningQueueView
            unreviewedNotes={unreviewedNotes}
            selectedId={selectedQueueId}
            onSelectNote={setSelectedQueueId}
            onMarkReviewed={handleMarkReviewed}
            onMarkAllReviewed={handleMarkAllReviewed}
            onAnalyzeNote={handleAnalyzeNote}
            onStartCapture={handleNewNote}
            analyzingNoteId={analyzingNoteId}
            analysisError={analysisError}
          />
        )}

        {activeTab === 'archive' && (
          <ArchiveView
            notes={nonEmptyNotes}
            onOpenInEditor={handleSelectNote}
            onDeleteNote={handleDeleteNote}
            onAnalyzeNote={handleAnalyzeNote}
            onNewNote={handleNewNote}
            analyzingNoteId={analyzingNoteId}
            analysisError={analysisError}
          />
        )}

        {activeTab === 'reminders' && (
          <RemindersView
            settings={reminderSettings}
            unreviewedCount={unreviewedNotes.length}
            onUpdateSettings={(patch) =>
              setReminderSettings((prev) => ({ ...prev, ...patch }))
            }
            onTriggerTestReminder={handleTriggerTestReminder}
            onOpenInstallGuide={() => setShowInstallModal(true)}
            isInstalled={isInstalled}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Natural Thumb Zone, <10% mobile viewport height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#FAF8F5]/95 dark:bg-[#050506]/95 backdrop-blur-md border-t border-[#E5E0D8] dark:border-[#1E1D1B] grid grid-cols-4 items-center px-2"
      >
        {(
          [
            { id: 'capture', label: 'Capture', Icon: Feather },
            {
              id: 'morning',
              label:
                unreviewedNotes.length > 0
                  ? `Queue (${unreviewedNotes.length})`
                  : 'Queue',
              Icon: Sunrise,
            },
            { id: 'archive', label: 'Archive', Icon: Archive },
            { id: 'reminders', label: 'Reminders', Icon: Bell },
          ] as const
        ).map(({ id, label, Icon }) => {
          const isCurrent = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`min-h-[44px] flex flex-col items-center justify-center rounded-xl transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70 ${
                isCurrent
                  ? 'text-[#9A6500] dark:text-[#F2B705]'
                  : 'text-[#6E685F] dark:text-[#8E877C]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-tight mt-0.5 truncate max-w-[76px]">
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Phone Home Screen Install Modal */}
      <PWAInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        isIOS={isIOS}
        isInIframe={isInIframe}
      />
    </div>
  );
}
