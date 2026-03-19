import { useState } from "react";
import { registerTg } from "@/lib/api";
import { saveToken } from "@/lib/auth";
import Icon from "@/components/ui/icon";

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

export default function AuthModal({ onSuccess, onClose }: Props) {
  const [step, setStep] = useState<"choose" | "tg">("choose");
  const [form, setForm] = useState({ telegram_id: "", telegram_username: "", display_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleTgRegister() {
    if (!form.telegram_id || !form.telegram_username) {
      setError("Заполни все поля");
      return;
    }
    setLoading(true);
    setError("");
    const res = await registerTg({
      telegram_id: Number(form.telegram_id),
      telegram_username: form.telegram_username,
      display_name: form.display_name || form.telegram_username,
      username: form.telegram_username,
    });
    setLoading(false);
    if (res.token) {
      saveToken(res.token);
      onSuccess();
    } else {
      setError(res.error || "Ошибка");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-[#0d0010] border border-[#6b1a1a] rounded-2xl shadow-2xl shadow-red-900/40 overflow-hidden">
        {/* Demonic glow top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-900 via-orange-600 to-red-900" />

        <button onClick={onClose} className="absolute top-4 right-4 text-[#8b3333] hover:text-red-400 transition-colors">
          <Icon name="X" size={20} />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-900 to-orange-800 flex items-center justify-center">
              <span className="text-2xl">🦊</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Войти в Ketfox</h2>
              <p className="text-sm text-[#8b6666]">Врата открыты для избранных</p>
            </div>
          </div>

          {step === "choose" && (
            <div className="space-y-3">
              <button
                onClick={() => setStep("tg")}
                className="w-full flex items-center gap-3 p-4 bg-[#1a0d1a] border border-[#4a1a4a] rounded-xl hover:border-[#8b3a8b] hover:bg-[#220d22] transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#0088cc]/20 flex items-center justify-center">
                  <Icon name="Send" size={20} className="text-[#0088cc]" />
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold group-hover:text-purple-300 transition-colors">Через Telegram</div>
                  <div className="text-xs text-[#665566]">Войти по ID из бота</div>
                </div>
                <Icon name="ChevronRight" size={16} className="ml-auto text-[#4a1a4a] group-hover:text-purple-400" />
              </button>
            </div>
          )}

          {step === "tg" && (
            <div className="space-y-4">
              <button onClick={() => setStep("choose")} className="flex items-center gap-1 text-sm text-[#8b3333] hover:text-red-400 mb-2 transition-colors">
                <Icon name="ChevronLeft" size={14} />
                Назад
              </button>

              <div className="bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl p-4 text-sm text-[#aa88aa] space-y-1">
                <p className="font-semibold text-purple-300 flex items-center gap-2">
                  <Icon name="Info" size={14} />
                  Как получить Telegram ID?
                </p>
                <p>Напиши боту <span className="text-white font-mono">@userinfobot</span> — он пришлёт твой ID</p>
              </div>

              <input
                type="number"
                placeholder="Telegram ID (числа)"
                value={form.telegram_id}
                onChange={e => setForm(f => ({ ...f, telegram_id: e.target.value }))}
                className="w-full bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl px-4 py-3 text-white placeholder-[#4a2a4a] focus:outline-none focus:border-[#8b3a8b] transition-colors"
              />
              <input
                type="text"
                placeholder="Username в Telegram (без @)"
                value={form.telegram_username}
                onChange={e => setForm(f => ({ ...f, telegram_username: e.target.value.replace("@", "") }))}
                className="w-full bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl px-4 py-3 text-white placeholder-[#4a2a4a] focus:outline-none focus:border-[#8b3a8b] transition-colors"
              />
              <input
                type="text"
                placeholder="Отображаемое имя (необязательно)"
                value={form.display_name}
                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                className="w-full bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl px-4 py-3 text-white placeholder-[#4a2a4a] focus:outline-none focus:border-[#8b3a8b] transition-colors"
              />

              {error && <p className="text-red-400 text-sm flex items-center gap-2"><Icon name="AlertCircle" size={14} />{error}</p>}

              <button
                onClick={handleTgRegister}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-800 to-orange-700 hover:from-red-700 hover:to-orange-600 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Flame" size={18} />}
                {loading ? "Проверяем..." : "Войти в Ketfox"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
