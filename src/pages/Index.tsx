import { useState, useEffect } from "react";
import { getMe } from "@/lib/api";
import { KfUser, getToken, clearToken, isAdmin } from "@/lib/auth";
import AuthModal from "@/components/AuthModal";
import ChatPanel from "@/components/ChatPanel";
import PostsGallery from "@/components/PostsGallery";
import OrdersPanel from "@/components/OrdersPanel";
import AdminPanel from "@/components/AdminPanel";
import ProfilePanel from "@/components/ProfilePanel";
import Icon from "@/components/ui/icon";

type Tab = "gallery" | "chat" | "orders" | "profile" | "admin";

const SIDEBAR_ITEMS: { id: Tab; icon: string; label: string; adminOnly?: boolean }[] = [
  { id: "gallery", icon: "Palette", label: "Арты" },
  { id: "chat", icon: "MessageCircle", label: "Чат" },
  { id: "orders", icon: "ShoppingBag", label: "Заказы" },
  { id: "profile", icon: "User", label: "Профиль" },
  { id: "admin", icon: "Shield", label: "Админ", adminOnly: true },
];

export default function Index() {
  const [user, setUser] = useState<KfUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [tab, setTab] = useState<Tab>("gallery");
  const [orderPrefill, setOrderPrefill] = useState<{ id: number; title: string; price?: number } | null>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  async function loadUser() {
    if (!getToken()) { setLoadingUser(false); return; }
    const data = await getMe();
    if (data?.id) setUser(data);
    else clearToken();
    setLoadingUser(false);
  }

  useEffect(() => { loadUser(); }, []);

  function handleAuthSuccess() {
    setShowAuth(false);
    loadUser();
  }

  function handleLogout() {
    setUser(null);
    setTab("gallery");
  }

  function handleOrderPost(post: { id: number; title: string; price?: number }) {
    setOrderPrefill(post);
    setTab("orders");
  }

  const visibleTabs = SIDEBAR_ITEMS.filter(t => !t.adminOnly || isAdmin(user));

  return (
    <div className="min-h-screen bg-[#050008] text-white overflow-x-hidden flex flex-col" style={{ fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-950/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-950/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-950/10 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative z-20 h-14 bg-[#0a0010]/90 backdrop-blur-md border-b border-[#2a0a2a] flex items-center px-4 gap-3">
        <button
          className="lg:hidden text-[#8b3333] hover:text-red-400 p-1"
          onClick={() => setMobileSidebar(v => !v)}
        >
          <Icon name="Menu" size={20} />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-900 to-orange-800 flex items-center justify-center shadow-lg shadow-red-900/50">
            <span className="text-lg">🦊</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black tracking-tight text-white">Ket</span>
            <span className="text-lg font-black tracking-tight text-red-500">fox</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 ml-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
          <span className="text-xs text-[#664466]">Демонические арты</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {loadingUser ? (
            <Icon name="Loader2" size={18} className="animate-spin text-red-700" />
          ) : user ? (
            <div className="flex items-center gap-2">
              {isAdmin(user) && (
                <span className="hidden sm:flex items-center gap-1 text-xs bg-red-950/60 text-red-300 px-2 py-1 rounded-full border border-red-900">
                  👹 Администратор
                </span>
              )}
              <button
                onClick={() => setTab("profile")}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-red-900 to-orange-800 flex items-center justify-center text-white text-sm font-bold hover:ring-2 hover:ring-red-700 transition-all"
              >
                {(user.display_name?.[0] || "?").toUpperCase()}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-red-900 to-orange-800 rounded-xl text-white text-sm font-semibold hover:from-red-800 hover:to-orange-700 transition-all shadow-lg shadow-red-900/30"
            >
              <Icon name="Flame" size={14} />
              Войти
            </button>
          )}
        </div>
      </nav>

      <div className="relative z-10 flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className={`
          ${mobileSidebar ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
          fixed lg:relative z-30 lg:z-auto
          w-60 h-full lg:h-auto
          bg-[#080010]/95 lg:bg-[#080010]/80 backdrop-blur-md
          border-r border-[#1a0a1a] flex flex-col
          transition-transform duration-200 ease-in-out
        `}>
          {/* Server name */}
          <div className="px-4 py-4 border-b border-[#1a0a1a]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-sm">🔥 Ketfox Server</h2>
                <p className="text-xs text-[#4a2a4a] mt-0.5">Обитель демонических артов</p>
              </div>
              <button className="lg:hidden text-[#664466] hover:text-red-400" onClick={() => setMobileSidebar(false)}>
                <Icon name="X" size={16} />
              </button>
            </div>
          </div>

          {/* Channels */}
          <div className="flex-1 p-2 overflow-y-auto">
            <div className="mb-1 px-2 py-1">
              <span className="text-xs font-bold text-[#4a2a4a] uppercase tracking-wider">Каналы</span>
            </div>
            {visibleTabs.map(item => (
              <button
                key={item.id}
                onClick={() => { setTab(item.id); setMobileSidebar(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all mb-0.5 group ${
                  tab === item.id
                    ? "bg-[#2a0a1a] text-red-300 border border-[#6b1a2a]"
                    : "text-[#664466] hover:text-[#aa8888] hover:bg-[#160816]"
                }`}
              >
                <Icon name={item.icon as "Palette"} size={16} className={tab === item.id ? "text-red-400" : "text-[#4a2a4a] group-hover:text-[#8b4466]"} />
                {item.id === "admin" ? (
                  <span className="flex items-center gap-1">{item.label} <span className="text-xs">👹</span></span>
                ) : (
                  item.label
                )}
              </button>
            ))}
          </div>

          {/* User area */}
          <div className="p-3 bg-[#060008] border-t border-[#1a0a1a]">
            {user ? (
              <div className="flex items-center gap-2 px-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-900 to-orange-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(user.display_name?.[0] || "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-semibold truncate">{user.display_name}</div>
                  <div className="text-[#4a2a4a] text-xs truncate">@{user.telegram_username}</div>
                </div>
                {isAdmin(user) && <span className="text-base">👹</span>}
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="w-full text-xs text-[#664466] hover:text-red-400 flex items-center gap-2 px-1 py-1 transition-colors"
              >
                <Icon name="LogIn" size={14} />
                Войти в систему
              </button>
            )}
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileSidebar && (
          <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setMobileSidebar(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Channel header */}
          <div className="h-12 bg-[#080010]/60 backdrop-blur-sm border-b border-[#1a0a1a] flex items-center px-4 gap-2 flex-shrink-0">
            <Icon name={SIDEBAR_ITEMS.find(t => t.id === tab)?.icon as "Palette" || "Hash"} size={18} className="text-[#6b1a3a]" />
            <span className="text-white font-semibold text-sm capitalize">
              {SIDEBAR_ITEMS.find(t => t.id === tab)?.label}
            </span>
            <div className="w-px h-4 bg-[#2a0a2a] mx-2 hidden sm:block" />
            <span className="text-[#4a2a4a] text-xs hidden sm:block">
              {tab === "gallery" && "Демонические арты мастеров"}
              {tab === "chat" && "Общение в реальном времени"}
              {tab === "orders" && "Система заказов"}
              {tab === "profile" && "Твой профиль в Ketfox"}
              {tab === "admin" && "Управление сервером"}
            </span>
          </div>

          {/* Tab content */}
          <div className={`flex-1 overflow-y-auto ${tab === "chat" ? "" : "p-4 sm:p-6"}`}>
            {tab === "gallery" && (
              <PostsGallery user={user} onOrder={handleOrderPost} />
            )}
            {tab === "chat" && (
              <div className="h-full flex flex-col">
                <ChatPanel user={user} onLoginRequest={() => setShowAuth(true)} />
              </div>
            )}
            {tab === "orders" && (
              <OrdersPanel
                user={user}
                onLoginRequest={() => setShowAuth(true)}
                prefillPost={orderPrefill}
                onClearPrefill={() => setOrderPrefill(null)}
              />
            )}
            {tab === "profile" && (
              user ? (
                <ProfilePanel user={user} onLogout={handleLogout} />
              ) : (
                <div className="text-center py-20">
                  <span className="text-5xl block mb-4">🦊</span>
                  <p className="text-[#664466] mb-4">Войди чтобы увидеть профиль</p>
                  <button onClick={() => setShowAuth(true)} className="px-6 py-2.5 bg-gradient-to-r from-red-900 to-orange-800 rounded-xl text-white font-semibold">
                    Войти
                  </button>
                </div>
              )
            )}
            {tab === "admin" && isAdmin(user) && (
              <AdminPanel />
            )}
          </div>
        </main>
      </div>

      {showAuth && <AuthModal onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />}
    </div>
  );
}
