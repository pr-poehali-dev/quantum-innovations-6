import { useState, useEffect, useRef } from "react";
import { getMessages, sendMessage, hideMessage } from "@/lib/api";
import { KfUser, isAdmin } from "@/lib/auth";
import Icon from "@/components/ui/icon";

const CHANNELS = [
  { id: "general", label: "общий", icon: "Hash" },
  { id: "arts", label: "арты", icon: "Palette" },
  { id: "orders", label: "заказы", icon: "ShoppingBag" },
];

interface Message {
  id: number;
  content: string;
  created_at: string;
  channel: string;
  author: { id: number; username: string; display_name: string; avatar_url: string | null; role: string };
}

interface Props {
  user: KfUser | null;
  onLoginRequest: () => void;
}

export default function ChatPanel({ user, onLoginRequest }: Props) {
  const [channel, setChannel] = useState("general");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = async () => {
    const data = await getMessages(channel, 50);
    if (Array.isArray(data)) setMessages(data);
  };

  useEffect(() => {
    setLoading(true);
    loadMessages().finally(() => setLoading(false));
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(loadMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [channel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!user) { onLoginRequest(); return; }
    if (!input.trim()) return;
    setSending(true);
    const msg = await sendMessage(input.trim(), channel);
    setSending(false);
    if (msg.id) {
      setMessages(prev => [...prev, msg]);
      setInput("");
    }
  }

  async function handleHide(id: number) {
    await hideMessage(id);
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  function timeAgo(iso: string) {
    const d = new Date(iso);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Channel tabs */}
      <div className="flex gap-1 px-4 pt-3 border-b border-[#2a0a2a]">
        {CHANNELS.map(ch => (
          <button
            key={ch.id}
            onClick={() => setChannel(ch.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-all ${
              channel === ch.id
                ? "bg-[#1a0d1a] text-red-400 border-t border-l border-r border-[#6b1a1a]"
                : "text-[#664466] hover:text-[#aa6688]"
            }`}
          >
            <Icon name={ch.icon as "Hash"} size={13} />
            {ch.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {loading && (
          <div className="flex justify-center py-8">
            <Icon name="Loader2" size={24} className="animate-spin text-red-700" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center py-12 text-[#4a2a4a]">
            <Icon name="MessageCircle" size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Пусто. Будь первым...</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className="flex gap-3 group">
            <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-red-900 to-orange-800 flex items-center justify-center text-white text-xs font-bold">
              {msg.author.avatar_url ? <img src={msg.author.avatar_url} alt="" className="w-full h-full object-cover" /> : (msg.author.display_name?.[0] || "?").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className={`text-sm font-semibold ${msg.author.role === "admin" ? "text-red-400" : "text-[#cc9999]"}`}>
                  {msg.author.display_name || msg.author.username}
                  {msg.author.role === "admin" && <span className="ml-1 text-xs bg-red-900/50 text-red-300 px-1 rounded">👹 Админ</span>}
                </span>
                <span className="text-xs text-[#4a2a4a]">{timeAgo(msg.created_at)}</span>
                {isAdmin(user) && (
                  <button onClick={() => handleHide(msg.id)} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[#6b1a1a] hover:text-red-400">
                    <Icon name="Trash2" size={13} />
                  </button>
                )}
              </div>
              <p className="text-[#ccaaaa] text-sm leading-relaxed break-words">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#2a0a2a]">
        {user?.is_muted && <p className="text-xs text-orange-400 mb-2 flex items-center gap-1"><Icon name="VolumeX" size={12} />Вы в муте</p>}
        <div className="flex gap-2 items-end">
          <textarea
            rows={1}
            placeholder={user ? `Написать в #${channel}...` : "Войди чтобы писать..."}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={!user || user.is_muted || sending}
            className="flex-1 bg-[#1a0810] border border-[#3a1030] rounded-xl px-4 py-2.5 text-[#ccaaaa] placeholder-[#4a2040] focus:outline-none focus:border-[#6b1a1a] resize-none text-sm transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!user || user.is_muted || !input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-900 to-orange-800 hover:from-red-800 hover:to-orange-700 disabled:opacity-30 flex items-center justify-center transition-all flex-shrink-0"
          >
            {sending ? <Icon name="Loader2" size={16} className="animate-spin text-white" /> : <Icon name="Send" size={16} className="text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}
