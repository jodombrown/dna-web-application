// Brief 14 (SPEC 41-14 Part B "Realtime", Part C item 3; ruling 1351): the member's inbox for the
// life of the session, read by the shell for the Messages control's dot and by the list for its
// rows. One react-query entry per projection, keyed by member, so the shell's subscription and the
// list surface read the same cache: an inbox event refetches the touched row through the list
// projection, a request event refetches the requests projection, and the dot is any unmuted,
// unarchived unread row. The thread_touch event also acknowledges delivery of what arrived, which
// is what turns the sender's first tick into the second (1336).
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Member } from "./auth";
import {
  anyUnread,
  deliveredTo,
  loadRequests,
  loadSettings,
  loadThread,
  loadThreads,
  subscribeInbox,
  type ThreadView,
} from "./messenger";

export const THREADS_KEY = (memberId: string) => ["messenger", "threads", memberId] as const;
export const REQUESTS_KEY = (memberId: string) => ["messenger", "requests", memberId] as const;
export const SETTINGS_KEY = (memberId: string) => ["messenger", "settings", memberId] as const;
export const SIGNALS_KEY = (memberId: string) => ["messenger", "signals", memberId] as const;

/** Replaces or adds one row of the list cache from the projection; drops it when the projection no longer returns it. */
export async function refreshThreadRow(qc: QueryClient, memberId: string, threadId: string) {
  const row = await loadThread(threadId).catch(() => null);
  qc.setQueryData<ThreadView[]>(THREADS_KEY(memberId), (prev) => {
    const list = prev ?? [];
    const rest = list.filter((t) => t.thread_id !== threadId);
    if (!row) return rest;
    return [row, ...rest];
  });
}

export function useThreads(member: Member) {
  return useQuery({ queryKey: THREADS_KEY(member.id), queryFn: loadThreads });
}

export function useRequests(member: Member) {
  return useQuery({ queryKey: REQUESTS_KEY(member.id), queryFn: loadRequests });
}

export function useMessagingSettings(member: Member) {
  return useQuery({ queryKey: SETTINGS_KEY(member.id), queryFn: loadSettings });
}

/**
 * Mounted once by the shell: the list projection, the inbox channel, and the dot. Every surface
 * that reads the same keys sees the rows this keeps current.
 */
export function useMessengerInbox(member: Member | null): { unread: boolean } {
  const qc = useQueryClient();
  const threads = useQuery({
    queryKey: THREADS_KEY(member?.id ?? ""),
    queryFn: loadThreads,
    enabled: !!member,
  });
  useEffect(() => {
    if (!member) return;
    const id = member.id;
    const off = subscribeInbox(id, {
      onThreadTouch: (threadId, seq) => {
        if (seq) deliveredTo(threadId, seq);
        void refreshThreadRow(qc, id, threadId);
      },
      onRequest: () => {
        void qc.invalidateQueries({ queryKey: REQUESTS_KEY(id) });
        void qc.invalidateQueries({ queryKey: SIGNALS_KEY(id) });
      },
      onInvitation: (threadId) => void refreshThreadRow(qc, id, threadId),
    });
    return off;
  }, [member, qc]);
  return { unread: anyUnread(threads.data ?? []) };
}
