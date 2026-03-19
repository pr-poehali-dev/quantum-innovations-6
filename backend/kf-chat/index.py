"""
Чат Ketfox — отправка и получение сообщений по каналам. Мут и бан учитываются.
"""
import json
import os
import psycopg2


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
}

CHANNELS = ["general", "arts", "orders", "admin"]


def get_user(token, cur):
    if not token:
        return None
    cur.execute(
        "SELECT u.id, u.role, u.is_banned, u.is_muted, u.display_name, u.avatar_url, u.mute_until FROM kf_sessions s JOIN kf_users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW()",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "role": row[1], "is_banned": row[2], "is_muted": row[3],
            "display_name": row[4], "avatar_url": row[5], "mute_until": row[6]}


def handler(event: dict, context) -> dict:
    """Чат: получение и отправка сообщений в каналы. Забаненные не могут писать."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    token = (event.get("headers") or {}).get("X-Auth-Token", "")
    params = event.get("queryStringParameters") or {}

    conn = get_conn()
    cur = conn.cursor()

    # GET /messages?channel=general&limit=50
    if method == "GET":
        channel = params.get("channel", "general")
        limit = min(int(params.get("limit", 50)), 100)
        before_id = params.get("before_id")

        query = """SELECT m.id, m.content, m.created_at, m.channel,
                          u.id, u.username, u.display_name, u.avatar_url, u.role
                   FROM kf_messages m JOIN kf_users u ON u.id = m.author_id
                   WHERE m.channel = %s AND m.is_hidden = FALSE"""
        args = [channel]
        if before_id:
            query += " AND m.id < %s"
            args.append(int(before_id))
        query += " ORDER BY m.created_at DESC LIMIT %s"
        args.append(limit)

        cur.execute(query, args)
        rows = cur.fetchall()
        conn.close()
        messages = []
        for r in rows:
            messages.append({
                "id": r[0], "content": r[1], "created_at": str(r[2]), "channel": r[3],
                "author": {"id": r[4], "username": r[5], "display_name": r[6], "avatar_url": r[7], "role": r[8]}
            })
        messages.reverse()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(messages)}

    # POST /send
    if method == "POST":
        user = get_user(token, cur)
        if not user:
            conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Нужно авторизоваться"})}
        if user["is_banned"]:
            conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Вы заблокированы"})}
        if user["is_muted"]:
            conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Вы в муте"})}

        body = json.loads(event.get("body") or "{}")
        content = (body.get("content") or "").strip()
        channel = body.get("channel", "general")
        if channel not in CHANNELS:
            channel = "general"
        if not content or len(content) > 2000:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Сообщение пустое или слишком длинное"})}

        cur.execute(
            "INSERT INTO kf_messages (author_id, channel, content) VALUES (%s, %s, %s) RETURNING id, created_at",
            (user["id"], channel, content)
        )
        msg_id, created_at = cur.fetchone()
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "id": msg_id, "content": content, "channel": channel, "created_at": str(created_at),
            "author": {"id": user["id"], "display_name": user["display_name"], "avatar_url": user["avatar_url"], "role": user["role"]}
        })}

    # PUT /hide/{id} — скрыть сообщение (только админ)
    if method == "PUT":
        user = get_user(token, cur)
        if not user or user["role"] != "admin":
            conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Только для администратора"})}
        parts = (event.get("path") or "").rstrip("/").split("/")
        msg_id = int(parts[-1])
        cur.execute("UPDATE kf_messages SET is_hidden = TRUE WHERE id = %s", (msg_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    conn.close()
    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}
