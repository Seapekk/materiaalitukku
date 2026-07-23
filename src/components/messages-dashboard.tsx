"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Message } from "@/lib/types";
import {
  deleteMessage,
  setMessageRead,
  type MsgActionState,
} from "@/app/[locale]/admin/messages/actions";

export function MessagesDashboard({ messages }: { messages: Message[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () => (filter === "unread" ? messages.filter((m) => !m.read) : messages),
    [messages, filter]
  );
  const unreadCount = messages.filter((m) => !m.read).length;

  const handleResult = (res: MsgActionState, msg?: string) => {
    if (res.error) setNotice("Something went wrong. Please try again.");
    else {
      if (msg) setNotice(msg);
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="admin-card flex flex-wrap items-center gap-2 p-3">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-brand text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f === "all" ? "All" : "Unread"} (
            {f === "all" ? messages.length : unreadCount})
          </button>
        ))}
      </div>

      {notice && (
        <p className="admin-card border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {notice}
        </p>
      )}

      <div className="admin-card divide-y divide-slate-100">
        {filtered.length === 0 && (
          <p className="p-10 text-center text-sm text-slate-400">No messages.</p>
        )}
        {filtered.map((m) => (
          <div key={m.id} className={`p-4 ${!m.read ? "bg-blue-50/60" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {m.sender_email} · {new Date(m.created_at).toLocaleDateString("en-GB")}
                {!m.read && (
                  <span className="admin-pill ml-2 bg-blue-100 text-blue-700">New</span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await setMessageRead(m.id, !m.read);
                      handleResult(res);
                    })
                  }
                  className="admin-btn px-2 py-1"
                >
                  {m.read ? "Mark unread" : "Mark read"}
                </button>
                <button
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("Permanently delete this message?")) return;
                    startTransition(async () => {
                      const res = await deleteMessage(m.id);
                      handleResult(res, "Deleted.");
                    });
                  }}
                  className="admin-btn admin-btn-danger px-2 py-1"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{m.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
