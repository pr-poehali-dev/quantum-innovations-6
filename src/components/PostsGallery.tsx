import { useState, useEffect } from "react";
import { getPosts, createPost, updatePost, uploadImage } from "@/lib/api";
import { KfUser, isAdmin } from "@/lib/auth";
import Icon from "@/components/ui/icon";

interface Post {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  is_for_sale: boolean;
  created_at: string;
  author_username: string;
  author_display_name: string;
}

interface Props {
  user: KfUser | null;
  onOrder: (post: Post) => void;
}

export default function PostsGallery({ user, onOrder }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [form, setForm] = useState({ title: "", description: "", price: "", is_for_sale: false, image_url: "" });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await getPosts();
    if (Array.isArray(data)) setPosts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditPost(null);
    setForm({ title: "", description: "", price: "", is_for_sale: false, image_url: "" });
    setShowForm(true);
  }

  function openEdit(post: Post) {
    setEditPost(post);
    setForm({ title: post.title, description: post.description || "", price: post.price ? String(post.price) : "", is_for_sale: post.is_for_sale, image_url: post.image_url || "" });
    setShowForm(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const ext = file.name.split(".").pop() || "jpg";
      const res = await uploadImage(base64, ext);
      if (res.url) setForm(f => ({ ...f, image_url: res.url }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    const data = { title: form.title, description: form.description, image_url: form.image_url, price: form.price ? Number(form.price) : undefined, is_for_sale: form.is_for_sale };
    if (editPost) {
      await updatePost(editPost.id, data);
    } else {
      await createPost(data);
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Icon name="Palette" size={24} className="text-red-500" />
            Галерея артов
          </h2>
          <p className="text-sm text-[#664466] mt-0.5">Демонические творения мастеров</p>
        </div>
        {isAdmin(user) && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-900 to-orange-800 rounded-xl text-white text-sm font-semibold hover:from-red-800 hover:to-orange-700 transition-all">
            <Icon name="Plus" size={16} />
            Добавить арт
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Icon name="Loader2" size={32} className="animate-spin text-red-700" />
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-20 text-[#4a2a4a]">
          <span className="text-5xl block mb-4">🔥</span>
          <p className="text-lg">Пока пусто. Скоро появятся арты...</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map(post => (
          <div key={post.id} className="group bg-[#0d0010] border border-[#2a0a2a] rounded-2xl overflow-hidden hover:border-[#6b1a1a] transition-all hover:shadow-lg hover:shadow-red-900/20">
            <div className="aspect-square bg-gradient-to-br from-[#1a0010] to-[#0a0020] flex items-center justify-center overflow-hidden relative">
              {post.image_url ? (
                <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <span className="text-6xl opacity-30">🎨</span>
              )}
              {post.is_for_sale && (
                <div className="absolute top-3 right-3 bg-gradient-to-r from-red-900 to-orange-800 text-white text-xs px-2 py-1 rounded-full font-bold">
                  Продаётся
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-white font-bold truncate mb-1">{post.title}</h3>
              {post.description && <p className="text-[#8b6666] text-sm line-clamp-2 mb-3">{post.description}</p>}
              <div className="flex items-center justify-between">
                {post.price ? (
                  <span className="text-orange-400 font-bold">{post.price.toLocaleString()} ₽</span>
                ) : <span />}
                <div className="flex gap-2">
                  {isAdmin(user) && (
                    <button onClick={() => openEdit(post)} className="p-2 rounded-lg bg-[#1a0820] hover:bg-[#2a1030] text-[#8b3a6b] hover:text-purple-400 transition-colors">
                      <Icon name="Pencil" size={14} />
                    </button>
                  )}
                  {post.is_for_sale && (
                    <button onClick={() => onOrder(post)} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-900/60 to-orange-900/60 hover:from-red-800 hover:to-orange-700 text-white text-xs font-semibold transition-all">
                      Заказать
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 bg-[#0d0010] border border-[#6b1a1a] rounded-2xl p-6 shadow-2xl shadow-red-900/40">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">{editPost ? "Редактировать арт" : "Новый арт"}</h3>
              <button onClick={() => setShowForm(false)} className="text-[#8b3333] hover:text-red-400">
                <Icon name="X" size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                placeholder="Название *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl px-4 py-2.5 text-white placeholder-[#4a2a4a] focus:outline-none focus:border-[#8b3a8b] text-sm"
              />
              <textarea
                placeholder="Описание"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl px-4 py-2.5 text-white placeholder-[#4a2a4a] focus:outline-none focus:border-[#8b3a8b] text-sm resize-none"
              />

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-[#6b3a6b] mb-1.5">Изображение</label>
                  <label className="flex items-center gap-2 cursor-pointer bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl px-4 py-2.5 hover:border-[#8b3a8b] transition-colors">
                    {uploading ? <Icon name="Loader2" size={16} className="animate-spin text-purple-400" /> : <Icon name="Upload" size={16} className="text-[#8b3a8b]" />}
                    <span className="text-sm text-[#8b6688]">{uploading ? "Загрузка..." : form.image_url ? "Изменить" : "Загрузить"}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[#6b3a6b] mb-1.5">Цена (₽)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full bg-[#1a0d1a] border border-[#3a1a3a] rounded-xl px-4 py-2.5 text-white placeholder-[#4a2a4a] focus:outline-none focus:border-[#8b3a8b] text-sm"
                  />
                </div>
              </div>

              {form.image_url && (
                <div className="rounded-xl overflow-hidden border border-[#3a1a3a] h-32">
                  <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setForm(f => ({ ...f, is_for_sale: !f.is_for_sale }))}
                  className={`w-10 h-6 rounded-full transition-all ${form.is_for_sale ? "bg-red-700" : "bg-[#2a0a2a]"} relative`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.is_for_sale ? "left-5" : "left-1"}`} />
                </div>
                <span className="text-sm text-[#aa8888]">Выставить на продажу</span>
              </label>

              <button
                onClick={handleSave}
                disabled={!form.title || saving}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-800 to-orange-700 hover:from-red-700 hover:to-orange-600 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Save" size={16} />}
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
