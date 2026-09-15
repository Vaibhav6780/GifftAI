import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../features/auth/authStore";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
// The socket.io server attaches to the root of the same HTTP server that serves
// /api — strip the /api suffix so socket.io's default path (/socket.io) resolves.
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

interface LeadAssignedPayload {
  leadIds: string[];
  ownerId: string | null;
}

interface LeadStatusChangedPayload {
  leadId: string;
  status: string;
}

interface LeadNoteCreatedPayload {
  leadId: string;
}

interface LeadCreatedPayload {
  leadId: string;
}

/**
 * Connects to the CRM's socket.io server (see apps/api/src/sockets/index.ts) and keeps
 * React Query's cache in sync with lead-assignment/status/note events emitted by other
 * users, so assignments, status changes, and notes show up live without a manual refresh.
 * Mounted once in AppShell (only rendered for authenticated routes) rather than per-page,
 * since these events can affect the leads list, lead detail, timeline, and the users list
 * (assigned-lead counts) regardless of which page is currently open.
 */
export function useRealtimeSync(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const socket: Socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      withCredentials: true,
    });

    socket.on("lead:assigned", ({ leadIds }: LeadAssignedPayload) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      for (const leadId of leadIds) {
        queryClient.invalidateQueries({ queryKey: ["leads", leadId] });
      }
    });

    socket.on("lead:status_changed", ({ leadId }: LeadStatusChangedPayload) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    socket.on("lead:note_created", ({ leadId }: LeadNoteCreatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ["leads", leadId, "notes"] });
    });

    socket.on("lead:note_updated", ({ leadId }: LeadNoteCreatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ["leads", leadId, "notes"] });
    });

    socket.on("lead:created", (_payload: LeadCreatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, queryClient]);
}
