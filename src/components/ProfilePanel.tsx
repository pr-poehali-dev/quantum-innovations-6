import { KfUser } from "@/lib/auth";
import { logout } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Props {
  user: KfUser;
  onLogout: () => void;
}

export default function ProfilePanel({ user, onLogout }: Props) {
  async function handleLogout() {
    await logout();
    onLogout();
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-[#0d0010] border border-[#2a0a2a] rounded-2xl overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-red-950 via-[#1a0020] to-orange-950 relative">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #ff0000 0%, transparent 50%), radial-gradient(circle at 80% 50%, #ff6600 0%, transparent 50%)" }} />
        </div>

        {/* Avatar */}
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-900 to-orange-800 border-4 border-[#0d0010] flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                (user.display_name?.[0] || "?").toUpperCase()
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a0810] border border-[#3a1020] text-[#8b3333] hover:text-red-400 hover:border-[#6b1a1a] text-sm transition-all"
            >
              <Icon name="LogOut" size={14} />
              Выйти
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{user.display_name || user.username}</h2>
                {user.role === "admin" && (
                  <span className="text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full border border-red-800 flex items-center gap-1">
                    👹 Администратор
                  </span>
                )}
              </div>
              <p className="text-[#664466] text-sm mt-0.5">@{user.telegram_username}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1a0810] rounded-xl p-3 border border-[#2a0a2a]">
                <div className="text-xs text-[#664466] mb-1">Статус</div>
                <div className={`text-sm font-semibold ${user.is_banned ? "text-gray-400" : user.is_muted ? "text-orange-400" : "text-green-400"}`}>
                  {user.is_banned ? "🔒 Заблокирован" : user.is_muted ? "🔇 В муте" : "✅ Активен"}
                </div>
              </div>
              <div className="bg-[#1a0810] rounded-xl p-3 border border-[#2a0a2a]">
                <div className="text-xs text-[#664466] mb-1">На сайте с</div>
                <div className="text-sm font-semibold text-[#ccaaaa]">
                  {new Date(user.created_at).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>
            </div>

            {user.is_banned && user.ban_reason && (
              <div className="bg-red-950/30 border border-red-900 rounded-xl p-3 flex items-start gap-2">
                <Icon name="AlertTriangle" size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-red-300 text-sm font-semibold">Причина блокировки</div>
                  <div className="text-red-400 text-sm">{user.ban_reason}</div>
                </div>
              </div>
            )}

            {user.is_muted && user.mute_until && (
              <div className="bg-orange-950/30 border border-orange-900 rounded-xl p-3 flex items-start gap-2">
                <Icon name="VolumeX" size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-orange-300 text-sm font-semibold">Мут до</div>
                  <div className="text-orange-400 text-sm">{new Date(user.mute_until).toLocaleString("ru")}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
