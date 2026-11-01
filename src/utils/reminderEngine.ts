import type { ReminderSettings, TwilightNoteItem } from '../types';

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  morningTime: '08:00',
  repeatMinutes: 30,
  soundChime: true,
  nightStartHour: 21,
  nightEndHour: 6,
};

export function isNightTimeNow(
  settings: ReminderSettings = DEFAULT_REMINDER_SETTINGS,
  date: Date = new Date()
): boolean {
  const hour = date.getHours();
  if (settings.nightStartHour > settings.nightEndHour) {
    return hour >= settings.nightStartHour || hour < settings.nightEndHour;
  }
  return hour >= settings.nightStartHour && hour < settings.nightEndHour;
}

export function computeNextMorningTimestamp(
  morningTime: string,
  fromDate: Date = new Date()
): number {
  const [rawH, rawM] = morningTime.split(':').map((n) => parseInt(n, 10));
  const hours = Number.isFinite(rawH) ? rawH : 8;
  const minutes = Number.isFinite(rawM) ? rawM : 0;

  const target = new Date(fromDate);
  target.setHours(hours, minutes, 0, 0);

  if (target.getTime() <= fromDate.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

export function formatClockTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function formatShortDate(timestamp: number): string {
  const now = new Date();
  const target = new Date(timestamp);
  const isToday =
    now.getFullYear() === target.getFullYear() &&
    now.getMonth() === target.getMonth() &&
    now.getDate() === target.getDate();

  if (isToday) {
    return `Today, ${formatClockTime(timestamp)}`;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(target);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function getNotePreviewTitle(note: TwilightNoteItem): string {
  if (note.analysis?.refinedTitle) {
    return note.analysis.refinedTitle;
  }
  const firstLine = note.rawText
    .trim()
    .split('\n')
    .find((line) => line.trim().length > 0);
  if (!firstLine) return 'Untitled thought';
  return firstLine.length > 58 ? `${firstLine.slice(0, 58).trim()}...` : firstLine;
}

export async function dispatchSystemNotification(
  title: string,
  body: string,
  onClick?: () => void
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'twilightnote-morning-reminder',
        });
        return true;
      }
    }

    const notif = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag: 'twilightnote-morning-reminder',
    });
    if (onClick) {
      notif.onclick = () => {
        window.focus();
        onClick();
        notif.close();
      };
    }
    return true;
  } catch {
    return false;
  }
}
