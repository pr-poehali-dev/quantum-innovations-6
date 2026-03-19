import { useState } from "react";
import { sendAuthCode, verifyAuthCode } from "@/lib/api";
import { saveToken } from "@/lib/auth";
import Icon from "@/components/ui/icon";

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

export default function AuthModal({ onSuccess, onClose }: Props) {
  const [step, setStep] = useState<"username" | "code">("username");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRequestCode() {
    const clean = username.trim().replace("@", "");
    if (!clean) { setError("Введи @username из Telegram"); return; }
    setLoading(true);
    setError("");
    await sendAuthCode(clean);
    setLoading(false);
    setStep("code");
  }

  async function handleVerify() {
    if (!code.trim()) { setError("Введи код из Telegram"); return; }
    setLoading(true);
    setError("");
    const res = await verifyAuthCode(
      username.trim().replace("@", ""),
      code.trim(),
      displayName || undefined
    );
    setLoading(false);
    if (res.token) {
      saveToken(res.token);
      onSuccess();
    } else {
      setError(res.error || "Неверный код");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-[#0d0010] border border-[#6b1a1a] rounded-2xl shadow-2xl shadow-red-900/40 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-900 via-orange-600 to-red-900" />

        <button onClick={onClose} className="absolute top-4 right-4 text-[#8b3333] hover:text-red-400 transition-colors">
          <Icon name="X" size={20} />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-900 to-orange-800 flex items-center justify-center shadow-lg shadow-red-900/50">
              <span className="text-2xl">🦊</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Войти в Ketfox</h2>
              <p className="text-sm text-[#8b6666]">Через Telegram бота</p>
            </div>
          </div>

          {step === "username" && (
            <div className="space-y-4">
              <div className="bg-[#150a1a] border border-[#3a1a3a] rounded-xl p-4 space-y-3">
                <p className="text-purple-300 font-semibold text-sm flex items-center gap-2">
                  <Icon name="Info" size={14} />
                  Как войти?
                </p>
                <div className="space-y-2">
                  {[
                    <>Открой бота <a href="https://t.me/KetfoxBot" target="_blank" rel="noopener noreferrer" className="text-[#0088cc] font-mono font-bold hover:underline">@KetfoxBot</a> и нажми <span className="text-white font-mono">/start</span></>,
                    <>Отправь команду <span className="text-white font-mono bg-[#1a0d1a] px-1.5 py-0.5 rounded">/code</span> — бот пришлёт 6 цифр</>,
                    <>Введи свой @username и код ниже</>,
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-red-900/60 border border-red-700 text-red-300 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                      <p className="text-[#aa88aa] text-sm">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <input
                type="text"
                placeholder="@username в Telegram"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRequestCode()}
                className="w-full bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl px-4 py-3 text-white placeholder-[#4a2a4a] focus:outline-none focus:border-[#8b3a8b] transition-colors"
              />
              <input
                type="text"
                placeholder="Имя на сайте (необязательно)"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl px-4 py-3 text-white placeholder-[#4a2a4a] focus:outline-none focus:border-[#8b3a8b] transition-colors"
              />

              {error && <p className="text-red-400 text-sm flex items-center gap-2"><Icon name="AlertCircle" size={14} />{error}</p>}

              <button
                onClick={handleRequestCode}
                disabled={loading || !username.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-800 to-orange-700 hover:from-red-700 hover:to-orange-600 text-white font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="ArrowRight" size={18} />}
                {loading ? "..." : "Далее — ввести код"}
              </button>

              <a
                href="https://t.me/KetfoxBot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-[#0088cc]/15 border border-[#0088cc]/30 hover:bg-[#0088cc]/25 text-[#0088cc] font-semibold transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Icon name="Send" size={16} />
                Открыть @KetfoxBot в Telegram
              </a>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-4">
              <button
                onClick={() => { setStep("username"); setCode(""); setError(""); }}
                className="flex items-center gap-1 text-sm text-[#8b3333] hover:text-red-400 transition-colors mb-1"
              >
                <Icon name="ChevronLeft" size={14} />
                Назад
              </button>

              <div className="bg-[#0a1a0a] border border-[#1a4a1a] rounded-xl p-4 text-sm text-green-300 flex items-start gap-2">
                <Icon name="CheckCircle" size={16} className="flex-shrink-0 mt-0.5" />
                <p>
                  Напиши <span className="font-mono font-bold">/code</span> боту{" "}
                  <a href="https://t.me/KetfoxBot" target="_blank" rel="noopener noreferrer" className="text-[#0088cc] hover:underline">@KetfoxBot</a>
                  {" "}— он пришлёт 6 цифр прямо в чат
                </p>
              </div>

              <p className="text-center text-[#aa88aa] text-sm">
                Код для <span className="text-white font-mono">@{username.replace("@", "")}</span>
              </p>

              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && handleVerify()}
                autoFocus
                className="w-full bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl px-4 py-4 text-white placeholder-[#4a2a4a] focus:outline-none focus:border-[#8b3a8b] transition-colors text-center text-2xl font-mono tracking-[0.5em]"
              />

              {error && (
                <p className="text-red-400 text-sm flex items-center gap-2 justify-center">
                  <Icon name="AlertCircle" size={14} />{error}
                </p>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || code.length < 6}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-800 to-orange-700 hover:from-red-700 hover:to-orange-600 text-white font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
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
