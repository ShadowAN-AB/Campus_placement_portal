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
      <button className="btn-ghost relative" onClick={() => setOpen((o) => !o)}>
        Inbox
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-2">
          <div className="flex justify-between px-2 py-1 text-xs text-zinc-500">
            <span>Notifications</span>
            <button
              onClick={async () => {
                await api("/v1/notifications/read-all", { method: "POST" });
                load();
              }}
            >
              Mark all
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
              className="block rounded-lg px-3 py-2 hover:bg-stone-50"
            >
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-zinc-500">{n.body}</p>
            </Link>
          ))}
          {!items.length && (
            <p className="px-3 py-4 text-sm text-zinc-500">{down ? "Inbox service is unavailable." : "No notifications yet."}</p>
          )}
        </div>
      )}
    </div>
  );
}
