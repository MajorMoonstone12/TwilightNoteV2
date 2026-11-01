export interface WebSource {
  title: string;
  uri: string;
}

export interface AIAnalysisResult {
  refinedTitle: string;
  corePremise: string;
  subconsciousInsight: string;
  realityCheck: string;
  properNote: string;
  actionSteps: string[];
  sources: WebSource[];
  analyzedAt: number;
}

export interface TwilightNoteItem {
  id: string;
  rawText: string;
  createdAt: number;
  updatedAt: number;
  isNightCapture: boolean;
  isReviewed: boolean;
  reviewedAt?: number;
  nagCount: number;
  lastRemindedAt?: number;
  nextReminderAt?: number;
  analysis?: AIAnalysisResult;
}

export interface ReminderSettings {
  enabled: boolean;
  morningTime: string; // HH:MM in 24-hour format, e.g., "08:00"
  repeatMinutes: number; // Persistent re-nag interval until note is opened & reviewed
  soundChime: boolean;
  nightStartHour: number; // Default 21 (9 PM)
  nightEndHour: number; // Default 6 (6 AM)
}

export type WorkspaceTab = 'capture' | 'morning' | 'archive' | 'reminders';
