import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiTry } from "../utils/api";

type Note = { _id: string; title: string; body: string; link?: string; read: boolean };

export function Bell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [down, setDown] = useState(false);

  async function load() {
    const data = await apiTry<{ items: Note[]; unreadCount: number }>("/v1/notifications", { items: [], unreadCount: 0 });
    setDown(data.down);
    setItems(data.data.items);
    setUnread(data.data.unreadCount);
  }

  useEffect(() => {
    load().catch(() => undefined);
    const t = setInterval(() => load().catch(() => undefined), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      <button className="btn-ghost relative !px-3 !py-1.5" onClick={() => setOpen((o) => !o)}>
        Inbox
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-700 px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-zinc-200 bg-white p-2">
          <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-500">
            <span className="font-medium text-zinc-800">Notifications</span>
            <button
              className="hover:text-zinc-800"
              onClick={async () => {
                await api("/v1/notifications/read-all", { method: "POST" });
                load();
              }}
            >
              Mark all read
            </button>
          </div>
          {items.slice(0, 8).map((n) => (
            <Link
              key={n._id}
              to={n.link ?? "#"}
              onClick={async () => {
                await api(`/v1/notifications/${n._id}/read`, { method: "POST" });
                setOpen(false);
                load();
              }}
              className="block rounded-xl px-3 py-2.5 hover:bg-zinc-50"
            >
              <p className="text-sm font-medium text-zinc-900">{n.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{n.body}</p>
            </Link>
          ))}
          {!items.length && (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">
              {down ? "Inbox service is unavailable." : "No notifications yet."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
