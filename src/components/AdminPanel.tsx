import { useState, useEffect } from "react";
import { getAdminUsers, banUser, unbanUser, muteUser, unmuteUser } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  telegram_username: string;
  role: string;
  is_banned: boolean;
  is_muted: boolean;
  ban_reason: string | null;
  mute_until: string | null;
  created_at: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionUser, setActionUser] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [muteHours, setMuteHours] = useState("1");
  const [actionType, setActionType] = useState<"ban" | "mute" | null>(null);

  const load = async () => {
    const data = await getAdminUsers();
    if (Array.isArray(data)) setUsers(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function handleBan() {
    if (!actionUser) return;
    await banUser(actionUser.id, banReason || "Нарушение правил");
    setActionUser(null);
    setBanReason("");
    load();
  }

  async function handleUnban(u: AdminUser) {
    await unbanUser(u.id);
    load();
  }

  async function handleMute() {
    if (!actionUser) return;
    await muteUser(actionUser.id, Number(muteHours) || 1);
    setActionUser(null);
    setMuteHours("1");
    load();
  }

  async function handleUnmute(u: AdminUser) {
    await unmuteUser(u.id);
    load();
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>👹</span>
          Панель администратора
        </h2>
        <p className="text-sm text-[#664466] mt-0.5">Управление пользователями Ketfox</p>
      </div>

      {loading && <div className="flex justify-center py-16"><Icon name="Loader2" size={32} className="animate-spin text-red-700" /></div>}

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="bg-[#0d0010] border border-[#2a0a2a] rounded-xl p-4 flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-900 to-orange-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {(u.display_name?.[0] || "?").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-semibold">{u.display_name || u.username}</span>
                {u.role === "admin" && <span className="text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full border border-red-800">👹 Админ</span>}
                {u.is_banned && <span className="text-xs bg-gray-900/50 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">🔒 Забанен</span>}
                {u.is_muted && <span className="text-xs bg-orange-900/40 text-orange-400 px-2 py-0.5 rounded-full border border-orange-800">🔇 Мут</span>}
              </div>
              <div className="text-xs text-[#664466] mt-0.5">
                @{u.telegram_username} · с {new Date(u.created_at).toLocaleDateString("ru")}
                {u.ban_reason && <span className="ml-2 text-red-500">Причина: {u.ban_reason}</span>}
              </div>
            </div>
            {u.role !== "admin" && (
              <div className="flex gap-2 flex-wrap">
                {u.is_banned ? (
                  <button onClick={() => handleUnban(u)} className="text-xs px-3 py-1.5 rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-800 transition-colors">
                    Разбанить
                  </button>
                ) : (
                  <button onClick={() => { setActionUser(u); setActionType("ban"); }} className="text-xs px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800 transition-colors">
                    Забанить
                  </button>
                )}
                {u.is_muted ? (
                  <button onClick={() => handleUnmute(u)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border border-blue-800 transition-colors">
                    Размутить
                  </button>
                ) : (
                  <button onClick={() => { setActionUser(u); setActionType("mute"); }} className="text-xs px-3 py-1.5 rounded-lg bg-orange-900/30 text-orange-400 hover:bg-orange-900/50 border border-orange-800 transition-colors">
                    Мут
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Modal */}
      {actionUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-[#0d0010] border border-[#6b1a1a] rounded-2xl p-6 shadow-2xl shadow-red-900/40">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">{actionType === "ban" ? "🔒 Забанить" : "🔇 Мут"} — {actionUser.display_name}</h3>
              <button onClick={() => setActionUser(null)} className="text-[#8b3333] hover:text-red-400">
                <Icon name="X" size={18} />
              </button>
            </div>
            {actionType === "ban" && (
              <div className="space-y-3">
                <input
                  placeholder="Причина бана"
                  value={banReason}
                  onChange={e => setBanReason(e.target.value)}
                  className="w-full bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl px-4 py-2.5 text-white placeholder-[#4a2a4a] focus:outline-none focus:border-[#8b3a8b] text-sm"
                />
                <button onClick={handleBan} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-800 to-red-700 text-white font-bold hover:from-red-700 hover:to-red-600 transition-all">
                  Забанить
                </button>
              </div>
            )}
            {actionType === "mute" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {[1, 3, 12, 24, 72].map(h => (
                    <button
                      key={h}
                      onClick={() => setMuteHours(String(h))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${muteHours === String(h) ? "bg-orange-800 text-white" : "bg-[#1a0d1a] text-[#8b6666] hover:bg-[#2a1020]"}`}
                    >
                      {h}ч
                    </button>
                  ))}
                </div>
                <button onClick={handleMute} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-800 to-orange-700 text-white font-bold hover:from-orange-700 hover:to-orange-600 transition-all">
                  Замутить на {muteHours} ч.
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
