const URLS = {
  auth: "https://functions.poehali.dev/1ae3f35e-9085-435d-8a8a-e1a717a2a95f",
  posts: "https://functions.poehali.dev/69f34a74-ec58-41fc-aa7c-ce0114c03985",
  chat: "https://functions.poehali.dev/690aa22a-cb8b-4419-901e-71e5bf820e52",
  orders: "https://functions.poehali.dev/f37201cd-7412-4a40-bbbd-b609e54f46ff",
};

function getToken(): string {
  return localStorage.getItem("kf_token") || "";
}

function authHeaders() {
  return { "Content-Type": "application/json", "X-Auth-Token": getToken() };
}

export async function registerTg(data: { telegram_id: number; telegram_username: string; display_name: string; username: string }) {
  const res = await fetch(`${URLS.auth}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  return res.json();
}

export async function getMe() {
  const res = await fetch(`${URLS.auth}/me`, { headers: authHeaders() });
  return res.json();
}

export async function logout() {
  await fetch(`${URLS.auth}/logout`, { method: "POST", headers: authHeaders() });
  localStorage.removeItem("kf_token");
}

export async function getPosts(params?: { for_sale?: boolean; limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (params?.for_sale) q.set("for_sale", "true");
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const res = await fetch(`${URLS.posts}/?${q}`, { headers: authHeaders() });
  return res.json();
}

export async function createPost(data: { title: string; description?: string; image_url?: string; price?: number; is_for_sale?: boolean }) {
  const res = await fetch(`${URLS.posts}/`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function updatePost(id: number, data: { title: string; description?: string; image_url?: string; price?: number; is_for_sale?: boolean }) {
  const res = await fetch(`${URLS.posts}/${id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function getMessages(channel = "general", limit = 50) {
  const res = await fetch(`${URLS.chat}/?channel=${channel}&limit=${limit}`, { headers: authHeaders() });
  return res.json();
}

export async function sendMessage(content: string, channel = "general") {
  const res = await fetch(`${URLS.chat}/send`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ content, channel }) });
  return res.json();
}

export async function hideMessage(id: number) {
  const res = await fetch(`${URLS.chat}/hide/${id}`, { method: "PUT", headers: authHeaders() });
  return res.json();
}

export async function getOrders() {
  const res = await fetch(`${URLS.orders}/`, { headers: authHeaders() });
  return res.json();
}

export async function createOrder(data: { title: string; description?: string; budget?: number; post_id?: number }) {
  const res = await fetch(`${URLS.orders}/`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function updateOrderStatus(id: number, status: string) {
  const res = await fetch(`${URLS.orders}/${id}/status`, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ status }) });
  return res.json();
}

export async function getAdminUsers() {
  const res = await fetch(`${URLS.auth}/admin/users`, { headers: authHeaders() });
  return res.json();
}

export async function banUser(user_id: number, reason: string) {
  const res = await fetch(`${URLS.auth}/admin/ban`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ user_id, reason }) });
  return res.json();
}

export async function unbanUser(user_id: number) {
  const res = await fetch(`${URLS.auth}/admin/unban`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ user_id }) });
  return res.json();
}

export async function muteUser(user_id: number, hours: number) {
  const res = await fetch(`${URLS.auth}/admin/mute`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ user_id, hours }) });
  return res.json();
}

export async function unmuteUser(user_id: number) {
  const res = await fetch(`${URLS.auth}/admin/unmute`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ user_id }) });
  return res.json();
}

export async function uploadImage(base64: string, ext = "jpg") {
  const res = await fetch(`${URLS.auth}/upload`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ image: base64, ext }) });
  return res.json();
}
