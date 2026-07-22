import { create } from "zustand";
import type { NotificationKind } from "../types";
import { useVoidClientStore } from "../stores/voidClient.store";

export type LauncherNotificationTone = "info" | "success" | "warning" | "error";

export interface LauncherNotification {
  id: string;
  title: string;
  message: string;
  tone: LauncherNotificationTone;
  createdAt: number;
  durationMs: number;
  dedupeKey?: string;
}

export interface LauncherNotificationInput {
  title: string;
  message: string;
  tone?: LauncherNotificationTone;
  durationMs?: number;
  dedupeKey?: string;
  /**
   * The corresponding persisted preference. Direct feedback for a
   * user-initiated operation may omit this value when no matching preference
   * exists.
   */
  preference?: Exclude<NotificationKind, "native-notifications">;
}

interface LauncherNotificationState {
  notifications: LauncherNotification[];
  publish: (input: LauncherNotificationInput) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

const MAX_VISIBLE_NOTIFICATIONS = 4;
let notificationSequence = 0;

function safeText(value: string, maximumLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maximumLength) return normalized;
  return `${normalized.slice(0, maximumLength - 1)}…`;
}

export const useLauncherNotificationStore = create<LauncherNotificationState>((set) => ({
  notifications: [],
  publish: (input) => {
    if (input.preference && !useVoidClientStore.getState().notifications[input.preference]) return;

    const now = Date.now();
    const notification: LauncherNotification = {
      id: `notice-${now}-${notificationSequence += 1}`,
      title: safeText(input.title, 72),
      message: safeText(input.message, 240),
      tone: input.tone ?? "info",
      createdAt: now,
      durationMs: Math.min(12_000, Math.max(2_500, input.durationMs ?? 5_000)),
      dedupeKey: input.dedupeKey,
    };

    set((state) => {
      const withoutDuplicate = input.dedupeKey
        ? state.notifications.filter((candidate) => candidate.dedupeKey !== input.dedupeKey)
        : state.notifications;
      return {
        notifications: [...withoutDuplicate, notification].slice(-MAX_VISIBLE_NOTIFICATIONS),
      };
    });
  },
  dismiss: (id) => set((state) => ({
    notifications: state.notifications.filter((notification) => notification.id !== id),
  })),
  clear: () => set({ notifications: [] }),
}));

export function publishLauncherNotification(input: LauncherNotificationInput) {
  useLauncherNotificationStore.getState().publish(input);
}
