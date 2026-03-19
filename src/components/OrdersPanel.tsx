import { useState, useEffect } from "react";
import { getOrders, createOrder, updateOrderStatus } from "@/lib/api";
import { KfUser, isAdmin } from "@/lib/auth";
import Icon from "@/components/ui/icon";

interface Order {
  id: number;
  title: string;
  description: string | null;
  budget: number | null;
  status: string;
  created_at: string;
  buyer_username: string;
  buyer_display_name: string;
  post_id: number | null;
}

interface Props {
  user: KfUser | null;
  onLoginRequest: () => void;
  prefillPost?: { id: number; title: string; price?: number } | null;
  onClearPrefill: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "Новый", color: "text-blue-400 bg-blue-900/30 border-blue-800" },
  in_progress: { label: "В работе", color: "text-orange-400 bg-orange-900/30 border-orange-800" },
  done: { label: "Готово", color: "text-green-400 bg-green-900/30 border-green-800" },
  cancelled: { label: "Отменён", color: "text-gray-400 bg-gray-900/30 border-gray-700" },
};

export default function OrdersPanel({ user, onLoginRequest, prefillPost, onClearPrefill }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", budget: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    const data = await getOrders();
    if (Array.isArray(data)) setOrders(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (prefillPost) {
      setForm({ title: `Заказ арта: ${prefillPost.title}`, description: "", budget: prefillPost.price ? String(prefillPost.price) : "" });
      setShowForm(true);
    }
  }, [prefillPost]);

  async function handleCreate() {
    if (!user) { onLoginRequest(); return; }
    setSaving(true);
    await createOrder({ title: form.title, description: form.description, budget: form.budget ? Number(form.budget) : undefined, post_id: prefillPost?.id });
    setSaving(false);
    setShowForm(false);
    onClearPrefill();
    load();
  }

  async function handleStatus(id: number, status: string) {
    await updateOrderStatus(id, status);
    load();
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <Icon name="Lock" size={40} className="mx-auto text-[#4a1a4a] mb-4" />
        <p className="text-[#664466] mb-4">Войди чтобы видеть заказы</p>
        <button onClick={onLoginRequest} className="px-6 py-2.5 bg-gradient-to-r from-red-900 to-orange-800 rounded-xl text-white font-semibold">
          Войти
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Icon name="ShoppingBag" size={24} className="text-orange-500" />
            Заказы
          </h2>
          <p className="text-sm text-[#664466] mt-0.5">{isAdmin(user) ? "Все входящие заказы" : "Мои заказы"}</p>
        </div>
        <button
          onClick={() => { setForm({ title: "", description: "", budget: "" }); onClearPrefill(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-900 to-orange-800 rounded-xl text-white text-sm font-semibold hover:from-red-800 hover:to-orange-700 transition-all"
        >
          <Icon name="Plus" size={16} />
          Новый заказ
        </button>
      </div>

      {loading && <div className="flex justify-center py-16"><Icon name="Loader2" size={32} className="animate-spin text-red-700" /></div>}

      {!loading && orders.length === 0 && (
        <div className="text-center py-20 text-[#4a2a4a]">
          <Icon name="Inbox" size={40} className="mx-auto mb-4 opacity-30" />
          <p>Заказов пока нет</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map(order => {
          const st = STATUS_LABELS[order.status] || STATUS_LABELS.new;
          return (
            <div key={order.id} className="bg-[#0d0010] border border-[#2a0a2a] rounded-2xl p-4 hover:border-[#4a1a4a] transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-white font-semibold truncate">{order.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                  </div>
                  {order.description && <p className="text-[#8b6666] text-sm">{order.description}</p>}
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {order.budget && <span className="text-orange-400 text-sm font-bold">{order.budget.toLocaleString()} ₽</span>}
                    {isAdmin(user) && <span className="text-xs text-[#664466]">от {order.buyer_display_name || order.buyer_username}</span>}
                    <span className="text-xs text-[#4a2a4a]">{new Date(order.created_at).toLocaleDateString("ru")}</span>
                  </div>
                </div>
                {isAdmin(user) && order.status !== "done" && order.status !== "cancelled" && (
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {order.status === "new" && (
                      <button onClick={() => handleStatus(order.id, "in_progress")} className="text-xs px-2 py-1 rounded-lg bg-orange-900/40 text-orange-400 hover:bg-orange-900/60 transition-colors whitespace-nowrap">
                        В работу
                      </button>
                    )}
                    {order.status === "in_progress" && (
                      <button onClick={() => handleStatus(order.id, "done")} className="text-xs px-2 py-1 rounded-lg bg-green-900/40 text-green-400 hover:bg-green-900/60 transition-colors whitespace-nowrap">
                        Готово
                      </button>
                    )}
                    <button onClick={() => handleStatus(order.id, "cancelled")} className="text-xs px-2 py-1 rounded-lg bg-gray-900/40 text-gray-400 hover:bg-gray-900/60 transition-colors whitespace-nowrap">
                      Отменить
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 bg-[#0d0010] border border-[#6b1a1a] rounded-2xl p-6 shadow-2xl shadow-red-900/40">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Новый заказ</h3>
              <button onClick={() => { setShowForm(false); onClearPrefill(); }} className="text-[#8b3333] hover:text-red-400">
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                placeholder="Тема заказа *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl px-4 py-2.5 text-white placeholder-[#4a2a4a] focus:outline-none focus:border-[#8b3a8b] text-sm"
              />
              <textarea
                placeholder="Описание (что именно нужно?)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl px-4 py-2.5 text-white placeholder-[#4a2a4a] focus:outline-none focus:border-[#8b3a8b] text-sm resize-none"
              />
              <input
                type="number"
                placeholder="Бюджет (₽, необязательно)"
                value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                className="w-full bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl px-4 py-2.5 text-white placeholder-[#4a2a4a] focus:outline-none focus:border-[#8b3a8b] text-sm"
              />
              <button
                onClick={handleCreate}
                disabled={!form.title || saving}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-800 to-orange-700 hover:from-red-700 hover:to-orange-600 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Send" size={16} />}
                Отправить заказ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
