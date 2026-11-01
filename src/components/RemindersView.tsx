import React, { useState } from 'react';
import { Bell, BellRing, Smartphone, Volume2 } from 'lucide-react';
import bedsideNotebookImg from '../assets/images/twilight_bedside_notebook_1793551680413.jpg';
import type { ReminderSettings } from '../types';
import { EditorialPicture } from './EditorialPicture';

interface RemindersViewProps {
  settings: ReminderSettings;
  unreviewedCount: number;
  onUpdateSettings: (patch: Partial<ReminderSettings>) => void;
  onTriggerTestReminder: () => void;
  onOpenInstallGuide: () => void;
  isInstalled: boolean;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  settings,
  unreviewedCount,
  onUpdateSettings,
  onTriggerTestReminder,
  onOpenInstallGuide,
  isInstalled,
}) => {
  const [notifPermission, setNotifPermission] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  const handleRequestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
    } catch {
      setNotifPermission(Notification.permission);
    }
  };

  return (
    <div className="space-y-12">
      {/* Balanced 2-Column Split Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#6E685F] dark:text-[#8E877C]">
              <span>Bedside Alarm &amp; Mobile Setup</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {unreviewedCount} unreviewed waiting
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#171614] dark:text-[#F4EFE6] [text-wrap:balance]">
              Persistent reminders that stay awake until your idea is reviewed
            </h1>
            <p className="text-base leading-relaxed text-[#57524A] dark:text-[#BDB5A6]">
              Standard alarms vanish with one sleepy swipe. TwilightNote
              dispatches your morning wake-up check at{' '}
              <span className="font-mono-tabular font-semibold text-[#171614] dark:text-[#F4EFE6]">
                {settings.morningTime}
              </span>{' '}
              and repeats every{' '}
              <span className="font-mono-tabular font-semibold text-[#171614] dark:text-[#F4EFE6]">
                {settings.repeatMinutes} minutes
              </span>{' '}
              until you open the note and mark it Reviewed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onTriggerTestReminder}
              className="min-h-[48px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F2B705] hover:bg-[#E2AA00] text-[#171614] font-semibold text-sm active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
            >
              <BellRing className="w-4 h-4" />
              <span>Test Morning Reminder</span>
            </button>

            {!isInstalled && (
              <button
                type="button"
                onClick={onOpenInstallGuide}
                className="min-h-[48px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-sm font-semibold text-[#171614] dark:text-[#F4EFE6] hover:bg-[#F2EEE6] dark:hover:bg-[#151519] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
              >
                <Smartphone className="w-4 h-4 text-[#9A6500] dark:text-[#F2B705]" />
                <span>Install on Android / iOS</span>
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-6">
          <EditorialPicture
            src={bedsideNotebookImg}
            alt="Open linen notebook and brass pen resting beside a warm amber bedside lamp at night"
            fallbackLabel="Bedside Capture & Morning Reckoning"
            className="rounded-3xl aspect-[16/9] lg:aspect-auto lg:h-full min-h-[240px]"
          >
            <div className="flex items-center gap-2 text-xs text-[#F4EFE6]/90 font-mono-tabular">
              <span>{settings.enabled ? 'Alarm Active' : 'Alarm Paused'}</span>
              <span aria-hidden="true">·</span>
              <span>Wake {settings.morningTime}</span>
              <span aria-hidden="true">·</span>
              <span>Follow-up every {settings.repeatMinutes}m</span>
            </div>
          </EditorialPicture>
        </div>
      </div>

      {/* Architectural Schedule Controls */}
      <div className="divide-y divide-[#E5E0D8] dark:divide-[#1E1D1B] border-t border-b border-[#E5E0D8] dark:border-[#1E1D1B]">
        {/* Enable / Disable */}
        <div className="py-6 flex items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <h2 className="text-base font-semibold text-[#171614] dark:text-[#F4EFE6]">
              Morning Unreviewed Alarm
            </h2>
            <p className="text-sm text-[#6E685F] dark:text-[#8E877C]">
              Trigger daily morning alerts whenever at least one captured note
              remains unreviewed.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            onClick={() => onUpdateSettings({ enabled: !settings.enabled })}
            className={`min-h-[44px] px-4 py-2 rounded-xl font-semibold text-xs active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70 ${
              settings.enabled
                ? 'bg-[#F2B705] text-[#171614]'
                : 'border border-[#E5E0D8] dark:border-[#1E1D1B] text-[#6E685F] dark:text-[#8E877C]'
            }`}
          >
            {settings.enabled ? 'Enabled' : 'Paused'}
          </button>
        </div>

        {/* Wake-up Time */}
        <div className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <label
              htmlFor="morning-wake-time"
              className="text-base font-semibold text-[#171614] dark:text-[#F4EFE6]"
            >
              Morning Wake-Up Time
            </label>
            <p className="text-sm text-[#6E685F] dark:text-[#8E877C]">
              Scheduled morning hour for your initial overnight thought check.
            </p>
          </div>

          <input
            id="morning-wake-time"
            type="time"
            value={settings.morningTime}
            onChange={(e) =>
              onUpdateSettings({ morningTime: e.target.value || '08:00' })
            }
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] font-mono-tabular text-sm font-medium text-[#171614] dark:text-[#F4EFE6] focus:outline-none focus:ring-2 focus:ring-[#F2B705]/70 self-start sm:self-auto"
          />
        </div>

        {/* Persistent Re-Nag Interval */}
        <div className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <h2 className="text-base font-semibold text-[#171614] dark:text-[#F4EFE6]">
              Persistent Follow-Up Cadence
            </h2>
            <p className="text-sm text-[#6E685F] dark:text-[#8E877C]">
              How soon to nudge again if you swipe away or snooze without
              marking the note Reviewed.
            </p>
          </div>

          <div
            role="group"
            aria-label="Follow-up interval"
            className="flex items-center gap-1 p-1 rounded-xl bg-[#EFECE4] dark:bg-[#0D0D10] border border-[#E5E0D8] dark:border-[#1E1D1B] self-start sm:self-auto"
          >
            {[15, 30, 45, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => onUpdateSettings({ repeatMinutes: mins })}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-lg font-mono-tabular text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70 ${
                  settings.repeatMinutes === mins
                    ? 'bg-white dark:bg-[#19191F] text-[#171614] dark:text-[#F4EFE6] shadow-xs'
                    : 'text-[#6E685F] dark:text-[#8E877C] hover:text-[#171614] dark:hover:text-[#F4EFE6]'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Gentle Morning Chime */}
        <div className="py-6 flex items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <h2 className="text-base font-semibold text-[#171614] dark:text-[#F4EFE6]">
              Harmonic Morning Chime
            </h2>
            <p className="text-sm text-[#6E685F] dark:text-[#8E877C]">
              Accompany morning reminders with a gentle three-note acoustic
              triad.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.soundChime}
            onClick={() =>
              onUpdateSettings({ soundChime: !settings.soundChime })
            }
            className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70 ${
              settings.soundChime
                ? 'bg-[#171614] dark:bg-[#F4EFE6] text-[#FAF8F5] dark:text-[#171614]'
                : 'border border-[#E5E0D8] dark:border-[#1E1D1B] text-[#6E685F] dark:text-[#8E877C]'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>{settings.soundChime ? 'Chime On' : 'Muted'}</span>
          </button>
        </div>

        {/* System Notification Permission */}
        <div className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <h2 className="text-base font-semibold text-[#171614] dark:text-[#F4EFE6]">
              System Push Notifications
            </h2>
            <p className="text-sm text-[#6E685F] dark:text-[#8E877C]">
              {notifPermission === 'granted'
                ? 'System notifications are active for background morning reminders.'
                : notifPermission === 'denied'
                ? 'Notifications are blocked in browser site settings. In-app reminders remain active.'
                : 'Allow system notifications so Android and desktop alerts appear even while backgrounded.'}
            </p>
          </div>

          {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
            <button
              type="button"
              onClick={handleRequestNotifications}
              className="min-h-[44px] self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] bg-white dark:bg-[#0D0D10] text-xs font-semibold text-[#171614] dark:text-[#F4EFE6] hover:bg-[#F2EEE6] dark:hover:bg-[#151519] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
            >
              <Bell className="w-4 h-4 text-[#9A6500] dark:text-[#F2B705]" />
              <span>Allow Notifications</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
